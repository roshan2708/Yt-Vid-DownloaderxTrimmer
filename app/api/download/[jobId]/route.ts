import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:4000';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const backendRes = await fetch(`${BACKEND_URL}/api/download/${encodeURIComponent(jobId)}`, {
      method: 'GET',
    });

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({ error: 'Download failed' }));
      return NextResponse.json(errData, { status: backendRes.status });
    }

    const headers = new Headers();
    const contentType = backendRes.headers.get('content-type') || 'video/mp4';
    const contentDisposition =
      backendRes.headers.get('content-disposition') || `attachment; filename="clip_${jobId.substring(0, 8)}.mp4"`;
    const contentLength = backendRes.headers.get('content-length');

    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', contentDisposition);
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new Response(backendRes.body, {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Backend processing service is unavailable.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
