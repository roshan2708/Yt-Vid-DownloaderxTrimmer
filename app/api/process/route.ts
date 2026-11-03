import { NextRequest, NextResponse } from 'next/server';
import { validateVideoUrl, validateTimeRange } from '@/server/utils/validator';
import { fetchVideoMetadata, processVideoJob } from '@/server/services/videoService';
import { jobManager } from '@/server/services/jobManager';
import { quotaService } from '@/server/services/quotaService';
import { verifyFirebaseIdToken } from '@/server/utils/firebaseAdmin';

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(request: NextRequest) {
  let body: {
    url?: string;
    quality?: number | string;
    startTime?: string;
    endTime?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request.' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization');

  // 1. If an external BACKEND_URL is configured, forward to it
  if (BACKEND_URL && !BACKEND_URL.includes('127.0.0.1') && !BACKEND_URL.includes('localhost')) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authHeader) headers['Authorization'] = authHeader;

      const backendRes = await fetch(`${BACKEND_URL}/api/process`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    } catch (proxyErr) {
      console.warn('External BACKEND_URL proxy failed, executing in-process fallback:', proxyErr);
    }
  }

  // 2. In-Process Execution Fallback
  try {
    // Verify Firebase Auth Token
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

    const { url, quality, startTime, endTime } = body;
    if (!url) {
      return NextResponse.json({ error: 'Video URL is required.' }, { status: 400 });
    }

    // Validate URL
    const urlCheck = validateVideoUrl(url);
    if (!urlCheck.isValid) {
      return NextResponse.json({ error: urlCheck.error }, { status: 400 });
    }

    // Fetch video metadata
    let videoDuration: number | undefined;
    let videoTitle = 'Video';
    let defaultQuality: number | undefined;

    try {
      const meta = await fetchVideoMetadata(urlCheck.normalizedUrl || url);
      videoDuration = meta.duration;
      videoTitle = meta.title;
      defaultQuality = meta.defaultQuality;
    } catch {
      console.warn('Metadata fetch warning prior to processing in route handler');
    }

    // Validate Quality
    let selectedQuality: number | undefined;
    if (quality !== undefined && quality !== null && quality !== '') {
      const parsed = typeof quality === 'number' ? quality : parseInt(quality, 10);
      if (!isNaN(parsed) && parsed > 0) {
        selectedQuality = parsed;
      }
    }
    if (!selectedQuality) {
      selectedQuality = defaultQuality || 720;
    }

    // Validate Time Range
    const timeCheck = validateTimeRange(startTime, endTime, videoDuration);
    if (!timeCheck.isValid) {
      return NextResponse.json({ error: timeCheck.error }, { status: 400 });
    }

    // Enforce Quota and Restrictions
    const quotaCheck = await quotaService.validateAndReserveQuota({
      userId: user.uid,
      email: user.email,
      requestedQuality: selectedQuality,
      startSeconds: timeCheck.startSeconds,
      endSeconds: timeCheck.endSeconds,
      isFullVideo: timeCheck.isFullVideo,
      sourceDuration: videoDuration,
    });

    if (!quotaCheck.allowed) {
      const statusCode = quotaCheck.code === 'LIMIT_REACHED' ? 429 : 403;
      return NextResponse.json(
        {
          error: quotaCheck.reason,
          code: quotaCheck.code,
          resetInSeconds: quotaCheck.resetInSeconds,
        },
        { status: statusCode }
      );
    }

    // Create Job
    const job = jobManager.createJob({
      url: urlCheck.normalizedUrl || url,
      title: videoTitle,
      startTime: timeCheck.formattedStart,
      endTime: timeCheck.formattedEnd,
      startSeconds: timeCheck.startSeconds,
      endSeconds: timeCheck.endSeconds,
      isFullVideo: timeCheck.isFullVideo,
      selectedQuality,
      userId: user.uid,
      quotaConsumed: true,
      quotaSource: quotaCheck.consumedFrom,
    });

    // Start background processing
    processVideoJob(job.id).catch((err) => {
      console.error(`Unhandled error in processVideoJob ${job.id}:`, err);
    });

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      step: 'Validating video URL.',
      isFullVideo: job.isFullVideo,
      selectedQuality: job.selectedQuality,
      quotaConsumedFrom: quotaCheck.consumedFrom,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to initiate video processing.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
