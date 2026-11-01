import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:4000';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const backendRes = await fetch(`${BACKEND_URL}/api/status/${encodeURIComponent(jobId)}`, {
      method: 'GET',
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Backend processing service is unavailable.';
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
