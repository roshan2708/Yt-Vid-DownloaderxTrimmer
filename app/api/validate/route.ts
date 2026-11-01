import { NextRequest, NextResponse } from 'next/server';
import { validateVideoUrl } from '@/server/utils/validator';
import { fetchVideoMetadata } from '@/server/services/videoService';

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid JSON request.' }, { status: 400 });
  }

  // 1. If an external BACKEND_URL is configured (not localhost/127.0.0.1), try forwarding
  if (BACKEND_URL && !BACKEND_URL.includes('127.0.0.1') && !BACKEND_URL.includes('localhost')) {
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    } catch (proxyErr) {
      console.warn('External BACKEND_URL proxy failed, executing in-process fallback:', proxyErr);
    }
  }

  // 2. Resilient In-Process Execution (Guarantees zero "fetch failed" in Render / Docker / local environments)
  try {
    const url = body?.url;
    if (!url) {
      return NextResponse.json({ valid: false, error: 'URL is required.' }, { status: 400 });
    }

    const urlCheck = validateVideoUrl(url);
    if (!urlCheck.isValid) {
      return NextResponse.json({ valid: false, error: urlCheck.error }, { status: 400 });
    }

    const metadata = await fetchVideoMetadata(urlCheck.normalizedUrl || url);
    return NextResponse.json(metadata);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to validate video URL.';
    return NextResponse.json({ valid: false, error: message }, { status: 400 });
  }
}
