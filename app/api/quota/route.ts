import { NextRequest, NextResponse } from 'next/server';
import { quotaService } from '@/server/services/quotaService';
import { verifyFirebaseIdToken } from '@/server/utils/firebaseAdmin';

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  // 1. If an external BACKEND_URL is configured, forward to it
  if (BACKEND_URL && !BACKEND_URL.includes('127.0.0.1') && !BACKEND_URL.includes('localhost')) {
    try {
      const headers: Record<string, string> = {};
      if (authHeader) headers['Authorization'] = authHeader;

      const backendRes = await fetch(`${BACKEND_URL}/api/user/quota`, {
        method: 'GET',
        headers,
      });

      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    } catch (proxyErr) {
      console.warn('External BACKEND_URL quota proxy failed, executing in-process fallback:', proxyErr);
    }
  }

  // 2. In-Process Execution Fallback
  try {
    let token: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token. Please sign in with Google.' },
        { status: 401 }
      );
    }

    const user = await verifyFirebaseIdToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or expired authentication token. Please sign in again.' },
        { status: 401 }
      );
    }

    const quota = await quotaService.getUserQuota(user.uid, {
      email: user.email,
      displayName: user.name,
      photoURL: user.picture,
    });
    return NextResponse.json(quota);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve user quota.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

