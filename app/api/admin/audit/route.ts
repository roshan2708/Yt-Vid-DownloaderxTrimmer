import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseFirestore, verifyAdminToken } from '@/server/utils/firebaseAdmin';

export async function GET(request: NextRequest) {
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
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      return NextResponse.json({ logs: [] });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));

    const snapshot = await firestore
      .collection('audit_logs')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const logs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        action: data.action || 'UNKNOWN',
        targetUserId: data.targetUserId || null,
        targetEmail: data.targetEmail || null,
        adminUid: data.adminUid || null,
        adminEmail: data.adminEmail || 'CLI / System',
        details: data.details || {},
        timestamp: data.timestamp || new Date().toISOString(),
      };
    });

    return NextResponse.json({ logs, count: logs.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve audit trail';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
