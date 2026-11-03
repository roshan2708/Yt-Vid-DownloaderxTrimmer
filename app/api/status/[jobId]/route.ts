import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/server/services/jobManager';

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  // 1. External BACKEND_URL proxy
  if (BACKEND_URL && !BACKEND_URL.includes('127.0.0.1') && !BACKEND_URL.includes('localhost')) {
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/status/${encodeURIComponent(jobId)}`, {
        method: 'GET',
      });
      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    } catch (proxyErr) {
      console.warn('External BACKEND_URL status proxy failed, falling back to jobManager:', proxyErr);
    }
  }

  // 2. In-Process Job Manager Fallback
  const job = jobManager.getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found or has expired.' }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    step: job.step,
    progress: job.progress,
    error: job.error || null,
    fileName: job.fileName,
    fileSize: job.fileSize,
    isFullVideo: job.isFullVideo,
    selectedQuality: job.selectedQuality,
    quotaRefunded: job.quotaRefunded || false,
  });
}
