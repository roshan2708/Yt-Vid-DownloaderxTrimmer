import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { Readable } from 'stream';
import { jobManager } from '@/server/services/jobManager';
import { verifyFirebaseIdToken } from '@/server/utils/firebaseAdmin';

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const authHeader = request.headers.get('authorization');
  const tokenParam = request.nextUrl.searchParams.get('token');

  // 1. External BACKEND_URL proxy if configured
  if (BACKEND_URL && !BACKEND_URL.includes('127.0.0.1') && !BACKEND_URL.includes('localhost')) {
    try {
      const searchParams = request.nextUrl.searchParams.toString();
      const query = searchParams ? `?${searchParams}` : '';

      const headers: Record<string, string> = {};
      if (authHeader) headers['Authorization'] = authHeader;

      const backendRes = await fetch(`${BACKEND_URL}/api/download/${encodeURIComponent(jobId)}${query}`, {
        method: 'GET',
        headers,
      });

      if (backendRes.ok) {
        const resHeaders = new Headers();
        const contentType = backendRes.headers.get('content-type') || 'video/mp4';
        const contentDisposition =
          backendRes.headers.get('content-disposition') || `attachment; filename="clip_${jobId.substring(0, 8)}.mp4"`;
        const contentLength = backendRes.headers.get('content-length');

        resHeaders.set('Content-Type', contentType);
        resHeaders.set('Content-Disposition', contentDisposition);
        if (contentLength) resHeaders.set('Content-Length', contentLength);

        return new Response(backendRes.body, {
          status: 200,
          headers: resHeaders,
        });
      }
    } catch (proxyErr) {
      console.warn('External BACKEND_URL download proxy failed, falling back to disk stream:', proxyErr);
    }
  }

  // 2. In-Process Download Execution Fallback
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (tokenParam) {
    token = tokenParam.trim();
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

  const job = jobManager.getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found or has expired.' }, { status: 404 });
  }

  // Verify ownership
  if (job.userId && job.userId !== user.uid) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to download this clip.' },
      { status: 403 }
    );
  }

  if (job.status !== 'completed' || !job.outputPath || !fs.existsSync(job.outputPath)) {
    return NextResponse.json(
      { error: job.error || 'Video file is not ready for download or has already been cleared.' },
      { status: 400 }
    );
  }

  const stat = fs.statSync(job.outputPath);
  const downloadFilename = job.fileName || `video_${job.id.substring(0, 8)}.mp4`;

  const headers = new Headers();
  headers.set('Content-Type', 'video/mp4');
  headers.set('Content-Disposition', `attachment; filename="${downloadFilename}"`);
  headers.set('Content-Length', stat.size.toString());

  const fileStream = fs.createReadStream(job.outputPath);
  const webStream = Readable.toWeb(fileStream);

  return new Response(webStream as any, {
    status: 200,
    headers,
  });
}
