import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:4000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const authHeader = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams.toString();
    const query = searchParams ? `?${searchParams}` : '';

    const headers: Record<string, string> = {};
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const backendRes = await fetch(`${BACKEND_URL}/api/download/${encodeURIComponent(jobId)}${query}`, {
      method: 'GET',
      headers,
    });

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({ error: 'Download failed' }));
      return NextResponse.json(errData, { status: backendRes.status });
    }

    const resHeaders = new Headers();
    const contentType = backendRes.headers.get('content-type') || 'video/mp4';
    const contentDisposition =
      backendRes.headers.get('content-disposition') || `attachment; filename="clip_${jobId.substring(0, 8)}.mp4"`;
    const contentLength = backendRes.headers.get('content-length');

    resHeaders.set('Content-Type', contentType);
    resHeaders.set('Content-Disposition', contentDisposition);
    if (contentLength) {
      resHeaders.set('Content-Length', contentLength);
    }

    return new Response(backendRes.body, {
      status: 200,
      headers: resHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Backend processing service is unavailable.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
