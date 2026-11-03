import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { AuthRequest, requireAuth } from './middleware/authMiddleware';
import { jobManager } from './services/jobManager';
import { quotaService } from './services/quotaService';
import { fetchVideoMetadata, processVideoJob } from './services/videoService';
import { getFirebaseAdminApp } from './utils/firebaseAdmin';
import { validateTimeRange, validateVideoUrl } from './utils/validator';

// Load .env and .env.local
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin SDK
getFirebaseAdminApp();

const app = express();
const PORT = process.env.BACKEND_PORT
  ? parseInt(process.env.BACKEND_PORT, 10)
  : (process.env.PORT && process.env.IS_STANDALONE_BACKEND ? parseInt(process.env.PORT, 10) : 4000);

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Basic Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const processLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // Max 30 video process requests per 10 minutes per IP
  message: { error: 'Video processing rate limit reached. Please wait a few minutes before submitting more jobs.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

/**
 * GET /api/user/quota
 * Protected: Returns user's tier, trims used today, daily limit, remaining trims, and seconds until UTC reset
 */
app.get('/api/user/quota', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: Missing user identity.' });
      return;
    }
    const quota = await quotaService.getUserQuota(userId, req.user?.email);
    res.json(quota);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve user quota.';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/validate
 * Public: Validates the video URL and returns metadata, available qualities, and default selection
 * Users can inspect video details before signing in.
 */
app.post('/api/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;

    const urlCheck = validateVideoUrl(url);
    if (!urlCheck.isValid) {
      res.status(400).json({ valid: false, error: urlCheck.error });
      return;
    }

    const metadata = await fetchVideoMetadata(urlCheck.normalizedUrl || url);
    res.json(metadata);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to validate video URL.';
    res.status(400).json({ valid: false, error: message });
  }
});

/**
 * POST /api/process
 * Protected: Requires verified Firebase ID Token in Authorization: Bearer <token>
 * Validates inputs, enforces daily quotas & constraints, creates job, and starts trimming
 */
app.post('/api/process', requireAuth, processLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { url, quality, startTime, endTime } = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User ID not found.' });
      return;
    }

    // 1. Validate URL
    const urlCheck = validateVideoUrl(url);
    if (!urlCheck.isValid) {
      res.status(400).json({ error: urlCheck.error });
      return;
    }

    // 2. Fetch metadata to verify video existence, duration, and qualities
    let videoDuration: number | undefined;
    let videoTitle = 'Video';
    let defaultQuality: number | undefined;

    try {
      const meta = await fetchVideoMetadata(urlCheck.normalizedUrl || url);
      videoDuration = meta.duration;
      videoTitle = meta.title;
      defaultQuality = meta.defaultQuality;
    } catch {
      console.warn('Metadata fetch warning prior to processing');
    }

    // 3. Validate Quality Selection
    let selectedQuality: number | undefined;
    if (quality !== undefined && quality !== null && quality !== '') {
      const parsedQuality = typeof quality === 'number' ? quality : parseInt(quality, 10);
      if (!isNaN(parsedQuality) && parsedQuality > 0) {
        selectedQuality = parsedQuality;
      }
    }
    if (!selectedQuality) {
      selectedQuality = defaultQuality || 720;
    }

    // 4. Validate Time Range
    const timeCheck = validateTimeRange(startTime, endTime, videoDuration);
    if (!timeCheck.isValid) {
      res.status(400).json({ error: timeCheck.error });
      return;
    }

    // 5. Quota & Limits Enforcement (Edge cases handled: daily cap, duration limits, quality restrictions)
    const quotaCheck = await quotaService.validateAndReserveQuota({
      userId,
      email: req.user?.email,
      requestedQuality: selectedQuality,
      startSeconds: timeCheck.startSeconds,
      endSeconds: timeCheck.endSeconds,
      isFullVideo: timeCheck.isFullVideo,
      sourceDuration: videoDuration,
    });

    if (!quotaCheck.allowed) {
      const statusCode = quotaCheck.code === 'LIMIT_REACHED' ? 429 : 403;
      res.status(statusCode).json({
        error: quotaCheck.reason,
        code: quotaCheck.code,
        resetInSeconds: quotaCheck.resetInSeconds,
      });
      return;
    }

    // 6. Create Job with authenticated user UID and quota metadata
    const job = jobManager.createJob({
      url: urlCheck.normalizedUrl || url,
      title: videoTitle,
      startTime: timeCheck.formattedStart,
      endTime: timeCheck.formattedEnd,
      startSeconds: timeCheck.startSeconds,
      endSeconds: timeCheck.endSeconds,
      isFullVideo: timeCheck.isFullVideo,
      selectedQuality,
      userId,
      quotaConsumed: true,
      quotaSource: quotaCheck.consumedFrom,
    });

    // 7. Start processing in background
    processVideoJob(job.id).catch((err) => {
      console.error(`Unhandled error in processVideoJob ${job.id}:`, err);
    });

    res.json({
      jobId: job.id,
      status: job.status,
      step: 'Validating video URL.',
      isFullVideo: job.isFullVideo,
      selectedQuality: job.selectedQuality,
      quotaConsumedFrom: quotaCheck.consumedFrom,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to initiate video processing.';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/status/:jobId
 * Returns the current status of the processing job
 */
app.get('/api/status/:jobId', (req: Request, res: Response): void => {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const job = jobManager.getJob(jobId);

  if (!job) {
    res.status(404).json({ error: 'Job not found or has expired.' });
    return;
  }

  res.json({
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
});

/**
 * GET /api/download/:jobId
 * Protected: Requires verified Firebase ID Token
 * Downloads the generated MP4 file
 */
app.get('/api/download/:jobId', requireAuth, (req: AuthRequest, res: Response): void => {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const job = jobManager.getJob(jobId);

  if (!job) {
    res.status(404).json({ error: 'Job not found or has expired.' });
    return;
  }

  // Verify that the downloading user owns the job
  if (job.userId && req.user?.uid && job.userId !== req.user.uid) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to download this clip.' });
    return;
  }

  if (job.status !== 'completed' || !job.outputPath || !fs.existsSync(job.outputPath)) {
    res.status(400).json({
      error: job.error || 'Video file is not ready for download or has already been cleared.',
    });
    return;
  }

  const downloadFilename = job.fileName || `video_${job.id.substring(0, 8)}.mp4`;

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);

  const fileStream = fs.createReadStream(job.outputPath);
  fileStream.pipe(res);

  fileStream.on('error', (err) => {
    console.error(`Error streaming download for job ${jobId}:`, err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream video file.' });
    }
  });
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[ClipDown Backend] Server running on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  jobManager.destroy();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  jobManager.destroy();
  server.close(() => {
    process.exit(0);
  });
});

export default app;
