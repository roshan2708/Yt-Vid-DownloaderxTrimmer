import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseFirestore, verifyAdminToken } from '@/server/utils/firebaseAdmin';
import { quotaService } from '@/server/services/quotaService';
import { getFirebaseAdminApp } from '@/server/utils/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';

function normalizeDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (val as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (typeof (val as { _seconds?: number })._seconds === 'number') {
    return new Date((val as { _seconds: number })._seconds * 1000).toISOString();
  }
  if (typeof (val as { seconds?: number }).seconds === 'number') {
    return new Date((val as { seconds: number }).seconds * 1000).toISOString();
  }
  return null;
}

function getTierLimit(tier?: string, customLimit?: number): number {
  if (typeof customLimit === 'number' && customLimit > 0) return customLimit;
  switch (tier) {
    case 'studio': return 500;
    case 'pro': return 200;
    case 'daypass': return 15;
    default: return 3;
  }
}

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
      let localUsers = quotaService.getLocalUsers().map((u) => {
        const tier = u.tier || 'free';
        const role = u.email === 'paisaan.dev@gmail.com' ? 'superadmin' : 'user';
        return {
          userId: u.userId,
          uid: u.userId,
          email: u.email || 'No email',
          displayName: u.displayName || null,
          photoURL: u.photoURL || null,
          role,
          tier,
          trimsToday: u.trimsToday || 0,
          trimsThisMonth: u.trimsThisMonth || 0,
          dailyLimit: getTierLimit(tier),
          bonusCredits: u.bonusCredits || 0,
          totalTrimsAllTime: u.totalTrimsAllTime || 0,
          isBanned: false,
          banReason: null,
          createdAt: normalizeDate(u.createdAt),
          lastLoginAt: normalizeDate(u.lastLoginAt),
        };
      });

      if (tierFilter !== 'all') {
        localUsers = localUsers.filter((u) => u.tier === tierFilter);
      }
      if (search) {
        localUsers = localUsers.filter((u) =>
          u.email.toLowerCase().includes(search) ||
          (u.displayName && u.displayName.toLowerCase().includes(search)) ||
          u.userId.toLowerCase().includes(search)
        );
      }

      return NextResponse.json({
        users: localUsers.slice(0, limit),
        count: localUsers.length,
      });
    }

    let query: FirebaseFirestore.Query = firestore.collection('users');

    if (tierFilter !== 'all') {
      query = query.where('tier', '==', tierFilter);
    }

    const snapshot = await query.limit(limit).get();
    let users = snapshot.docs.map((doc) => {
      const data = doc.data();
      const tier = data.tier || 'free';
      const role = data.role || (data.email === 'paisaan.dev@gmail.com' ? 'superadmin' : 'user');
      return {
        userId: doc.id,
        uid: data.uid || doc.id,
        email: data.email || 'No email',
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        role,
        tier,
        trimsToday: data.trimsToday || 0,
        trimsThisMonth: data.trimsThisMonth || 0,
        dailyLimit: getTierLimit(tier, data.dailyLimit),
        bonusCredits: data.bonusCredits || 0,
        totalTrimsAllTime: data.totalTrimsAllTime || 0,
        isBanned: Boolean(data.isBanned),
        banReason: data.banReason || null,
        createdAt: normalizeDate(data.createdAt),
        lastLoginAt: normalizeDate(data.lastLoginAt),
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
      switch (action) {
        case 'UPDATE_TIER': {
          const { tier } = body;
          if (!['free', 'pro', 'studio', 'daypass'].includes(tier)) {
            return NextResponse.json({ error: 'Invalid tier specified' }, { status: 400 });
          }
          quotaService.updateLocalUser(userId, { tier });
          return NextResponse.json({ success: true, action: 'USER_TIER_UPDATED', userId });
        }
        case 'ADD_CREDITS': {
          const credits = parseInt(body.credits, 10);
          if (isNaN(credits) || credits <= 0) {
            return NextResponse.json({ error: 'Invalid credits amount' }, { status: 400 });
          }
          const user = quotaService.getLocalUsers().find((u) => u.userId === userId);
          const current = user?.bonusCredits || 0;
          quotaService.updateLocalUser(userId, { bonusCredits: current + credits });
          return NextResponse.json({ success: true, action: 'BONUS_CREDITS_ADDED', userId });
        }
        case 'RESET_QUOTA': {
          quotaService.updateLocalUser(userId, { trimsToday: 0 });
          return NextResponse.json({ success: true, action: 'QUOTA_MANUALLY_RESET', userId });
        }
        case 'TOGGLE_BAN': {
          return NextResponse.json({ success: true, action: body.isBanned ? 'USER_BANNED' : 'USER_UNBANNED', userId });
        }
        default:
          return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
      }
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

