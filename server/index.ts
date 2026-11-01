import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { jobManager } from './services/jobManager';
import { fetchVideoMetadata, processVideoJob } from './services/videoService';
import { validateTimeRange, validateVideoUrl } from './utils/validator';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

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
  max: 20, // Max 20 video process requests per 10 minutes per IP
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
 * POST /api/validate
 * Validates the video URL and returns metadata
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
 * Validates inputs, creates job, starts background video trimming
 */
app.post('/api/process', processLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, startTime = '00:00:00', endTime } = req.body;

    // Validate URL
    const urlCheck = validateVideoUrl(url);
    if (!urlCheck.isValid) {
      res.status(400).json({ error: urlCheck.error });
      return;
    }

    if (!endTime) {
      res.status(400).json({ error: 'End time is required.' });
      return;
    }

    // Step 1: Validate URL & metadata to ensure bounds are respected
    let videoDuration: number | undefined;
    let videoTitle = 'Clip';

    try {
      const meta = await fetchVideoMetadata(urlCheck.normalizedUrl || url);
      videoDuration = meta.duration;
      videoTitle = meta.title;
    } catch {
      // If metadata fetch fails or is slow, proceed with basic bounds if direct URL
      console.warn('Metadata fetch warning prior to processing');
    }

    // Step 2: Validate Time Range
    const timeCheck = validateTimeRange(startTime, endTime, videoDuration);
    if (!timeCheck.isValid) {
      res.status(400).json({ error: timeCheck.error });
      return;
    }

    // Step 3: Create Job
    const job = jobManager.createJob({
      url: urlCheck.normalizedUrl || url,
      title: videoTitle,
      startTime: timeCheck.formattedStart,
      endTime: timeCheck.formattedEnd,
      startSeconds: timeCheck.startSeconds,
      endSeconds: timeCheck.endSeconds,
    });

    // Start video processing in background
    processVideoJob(job.id).catch((err) => {
      console.error(`Unhandled error in processVideoJob ${job.id}:`, err);
    });

    res.json({
      jobId: job.id,
      status: job.status,
      step: 'Validating video URL.',
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
  });
});

/**
 * GET /api/download/:jobId
 * Downloads the generated MP4 file
 */
app.get('/api/download/:jobId', (req: Request, res: Response): void => {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const job = jobManager.getJob(jobId);

  if (!job) {
    res.status(404).json({ error: 'Job not found or has expired.' });
    return;
  }

  if (job.status !== 'completed' || !job.outputPath || !fs.existsSync(job.outputPath)) {
    res.status(400).json({
      error: job.error || 'Video file is not ready for download or has already been cleared.',
    });
    return;
  }

  const downloadFilename = job.fileName || `clip_${job.id.substring(0, 8)}.mp4`;

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
