import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseFirestore, verifyAdminToken } from '@/server/utils/firebaseAdmin';
import { getFirebaseAdminApp } from '@/server/utils/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized: Missing administrative authorization token.' },
      { status: 401 }
    );
  }

  const admin = await verifyAdminToken(token);
  if (!admin) {
    return NextResponse.json(
      { error: 'Forbidden: Administrative privileges required.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase()?.trim() || '';
    const tierFilter = searchParams.get('tier')?.toLowerCase() || 'all';
    const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));

    const firestore = getFirebaseFirestore();
    if (!firestore) {
      return NextResponse.json({
        users: [],
        total: 0,
        warning: 'Firestore is not operational; local storage users are not queryable via admin search.',
      });
    }

    let query: FirebaseFirestore.Query = firestore.collection('users');

    if (tierFilter !== 'all') {
      query = query.where('tier', '==', tierFilter);
    }

    const snapshot = await query.limit(limit).get();
    let users = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        userId: doc.id,
        uid: data.uid || doc.id,
        email: data.email || 'No email',
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        role: data.role || 'user',
        tier: data.tier || 'free',
        trimsToday: data.trimsToday || 0,
        trimsThisMonth: data.trimsThisMonth || 0,
        dailyLimit: data.dailyLimit || 3,
        bonusCredits: data.bonusCredits || 0,
        totalTrimsAllTime: data.totalTrimsAllTime || 0,
        isBanned: Boolean(data.isBanned),
        banReason: data.banReason || null,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null,
        lastLoginAt: data.lastLoginAt?.toDate ? data.lastLoginAt.toDate().toISOString() : data.lastLoginAt || null,
      };
    });

    if (search) {
      users = users.filter((u) => {
        return (
          u.email.toLowerCase().includes(search) ||
          (u.displayName && u.displayName.toLowerCase().includes(search)) ||
          u.userId.toLowerCase().includes(search)
        );
      });
    }

    return NextResponse.json({ users, count: users.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query users';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await verifyAdminToken(token);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing target userId' }, { status: 400 });
    }

    const firestore = getFirebaseFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Firestore is unavailable' }, { status: 503 });
    }

    const userRef = firestore.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User document not found' }, { status: 404 });
    }

    const targetUser = userSnap.data()!;
    let auditAction = '';
    const auditDetails: Record<string, unknown> = {};

    switch (action) {
      case 'UPDATE_TIER': {
        const { tier } = body;
        if (!['free', 'pro', 'studio', 'daypass'].includes(tier)) {
          return NextResponse.json({ error: 'Invalid tier specified' }, { status: 400 });
        }
        await userRef.update({
          tier,
          updatedAt: new Date().toISOString(),
        });
        auditAction = 'USER_TIER_UPDATED';
        auditDetails.previousTier = targetUser.tier;
        auditDetails.newTier = tier;
        break;
      }

      case 'ADD_CREDITS': {
        const credits = parseInt(body.credits, 10);
        if (isNaN(credits) || credits <= 0) {
          return NextResponse.json({ error: 'Invalid credits amount' }, { status: 400 });
        }
        const { FieldValue } = require('firebase-admin/firestore');
        await userRef.update({
          bonusCredits: FieldValue.increment(credits),
          updatedAt: new Date().toISOString(),
        });
        auditAction = 'BONUS_CREDITS_ADDED';
        auditDetails.addedCredits = credits;
        auditDetails.previousBonus = targetUser.bonusCredits || 0;
        break;
      }

      case 'RESET_QUOTA': {
        await userRef.update({
          trimsToday: 0,
          updatedAt: new Date().toISOString(),
        });
        auditAction = 'QUOTA_MANUALLY_RESET';
        auditDetails.previousTrimsToday = targetUser.trimsToday || 0;
        break;
      }

      case 'TOGGLE_BAN': {
        const isBanned = Boolean(body.isBanned);
        const reason = body.reason || (isBanned ? 'Violation of terms of service' : null);
        await userRef.update({
          isBanned,
          banReason: reason,
          bannedAt: isBanned ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        });
        auditAction = isBanned ? 'USER_BANNED' : 'USER_UNBANNED';
        auditDetails.reason = reason;
        break;
      }

      case 'UPDATE_ROLE': {
        if (admin.role !== 'superadmin') {
          return NextResponse.json(
            { error: 'Forbidden: Only Superadmins can promote or demote user roles.' },
            { status: 403 }
          );
        }
        const { role } = body;
        if (!['user', 'admin', 'superadmin'].includes(role)) {
          return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
        }

        // Set Firebase Auth custom claims
        const app = getFirebaseAdminApp();
        if (app) {
          const auth = getAuth(app);
          await auth.setCustomUserClaims(userId, {
            admin: role === 'admin' || role === 'superadmin',
            role,
          });
        }

        await userRef.update({
          role,
          isAdmin: role === 'admin' || role === 'superadmin',
          updatedAt: new Date().toISOString(),
        });
        auditAction = 'USER_ROLE_CHANGED';
        auditDetails.previousRole = targetUser.role;
        auditDetails.newRole = role;
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Write to audit trail
    await firestore.collection('audit_logs').add({
      action: auditAction,
      targetUserId: userId,
      targetEmail: targetUser.email || 'unknown',
      adminUid: admin.uid,
      adminEmail: admin.email || 'unknown',
      details: auditDetails,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      action: auditAction,
      userId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Administrative operation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

