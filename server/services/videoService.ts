import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Job, VideoMetadata, VideoQuality } from '../types';
import { formatBytes, formatSeconds, getQualityLabel } from '../utils/validator';
import { jobManager, TEMP_DIR } from './jobManager';

// Candidate paths for binaries (handles macOS Homebrew, Linux Ubuntu VPS, standard PATH)
const YT_DLP_CANDIDATES = ['yt-dlp', '/opt/homebrew/bin/yt-dlp', '/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp'];
const FFMPEG_CANDIDATES = ['ffmpeg', '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg'];
const FFPROBE_CANDIDATES = ['ffprobe', '/opt/homebrew/bin/ffprobe', '/usr/local/bin/ffprobe', '/usr/bin/ffprobe'];

function resolveBinary(candidates: string[]): string {
  for (const bin of candidates) {
    if (bin.startsWith('/')) {
      if (fs.existsSync(bin)) return bin;
    }
  }
  return candidates[0]; // fallback to naked command (uses PATH)
}

const YT_DLP_BIN = resolveBinary(YT_DLP_CANDIDATES);
const FFMPEG_BIN = resolveBinary(FFMPEG_CANDIDATES);
const FFPROBE_BIN = resolveBinary(FFPROBE_CANDIDATES);

/**
 * Execute command with promise
 */
function execProcess(
  cmd: string,
  args: string[],
  options?: { onProgress?: (text: string) => void; timeoutMs?: number }
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (options?.onProgress) options.onProgress(text);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (options?.onProgress) options.onProgress(text);
    });

    let timer: NodeJS.Timeout | null = null;
    if (options?.timeoutMs) {
      timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Command timed out after ${options.timeoutMs}ms`));
      }, options.timeoutMs);
    }

    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? 0 });
    });

    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
  });
}

interface RawYtDlpFormat {
  format_id?: string;
  height?: number;
  width?: number;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  tbr?: number;
  vbr?: number;
  abr?: number;
  ext?: string;
}

/**
 * Extract available video qualities from yt-dlp metadata
 */
function parseAvailableQualities(formats: RawYtDlpFormat[] = [], duration: number = 0): VideoQuality[] {
  // Find highest audio filesize to add to video-only formats
  let bestAudioSize = 0;
  for (const f of formats) {
    if (f.vcodec === 'none' && f.acodec !== 'none') {
      const size = f.filesize || f.filesize_approx;
      if (size && size > bestAudioSize) {
        bestAudioSize = size;
      }
    }
  }

  // Group by distinct video heights
  const heightMap = new Map<number, { formatId?: string; filesize?: number }>();

  for (const f of formats) {
    // Must contain a video stream and a valid height
    if (f.vcodec !== 'none' && typeof f.height === 'number' && f.height > 0) {
      const h = f.height;
      let calculatedSize = f.filesize || f.filesize_approx;

      // If video-only, add estimated audio stream size
      if (f.acodec === 'none' && calculatedSize && bestAudioSize > 0) {
        calculatedSize += bestAudioSize;
      } else if (!calculatedSize && f.tbr && duration > 0) {
        calculatedSize = Math.round((f.tbr * 1000 * duration) / 8);
      }

      const existing = heightMap.get(h);
      if (!existing || (calculatedSize && (!existing.filesize || calculatedSize > existing.filesize))) {
        heightMap.set(h, {
          formatId: f.format_id,
          filesize: calculatedSize,
        });
      }
    }
  }

  const qualities: VideoQuality[] = [];
  for (const [height, info] of heightMap.entries()) {
    qualities.push({
      height,
      label: getQualityLabel(height),
      filesize: info.filesize,
      formattedSize: formatBytes(info.filesize),
      formatId: info.formatId,
    });
  }

  // Sort descending by height (e.g. 2160, 1440, 1080, 720, 480...)
  qualities.sort((a, b) => b.height - a.height);
  return qualities;
}

/**
 * Calculates default quality according to rule:
 * "Default to 720p if available; otherwise select the highest available quality up to 720p."
 */
function pickDefaultQuality(qualities: VideoQuality[]): number | undefined {
  if (qualities.length === 0) return undefined;

  // 1. If 720p is available, pick 720
  const has720 = qualities.find((q) => q.height === 720);
  if (has720) return 720;

  // 2. Highest available quality up to 720
  const upTo720 = qualities.filter((q) => q.height <= 720);
  if (upTo720.length > 0) {
    // qualities are sorted descending, so first item is highest <= 720
    return upTo720[0].height;
  }

  // 3. Otherwise pick lowest of what's available (> 720) or first
  return qualities[qualities.length - 1].height;
}

/**
 * Fetches video metadata via yt-dlp, with fallback to ffprobe
 */
export async function fetchVideoMetadata(url: string): Promise<VideoMetadata> {
  // Strategy 1: yt-dlp
  try {
    const { stdout, code } = await execProcess(
      YT_DLP_BIN,
      ['--dump-single-json', '--no-warnings', '--no-playlist', '--ignore-errors', url],
      { timeoutMs: 30000 }
    );

    if (code === 0 && stdout.trim()) {
      const data = JSON.parse(stdout);
      let duration = typeof data.duration === 'number' ? data.duration : 0;
      const title = data.title || 'Video';
      const thumbnail =
        data.thumbnail || (Array.isArray(data.thumbnails) && data.thumbnails.length > 0 ? data.thumbnails[0].url : undefined);
      const uploader = data.uploader || data.channel || data.extractor || '';

      // If duration is 0, query ffprobe for duration for direct links
      if (duration === 0) {
        try {
          const probe = await execProcess(
            FFPROBE_BIN,
            ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', url],
            { timeoutMs: 10000 }
          );
          if (probe.code === 0 && probe.stdout.trim()) {
            const probeData = JSON.parse(probe.stdout);
            if (probeData.format?.duration) {
              duration = Math.round(parseFloat(probeData.format.duration));
            }
          }
        } catch {
          // ignore
        }
      }

      // Parse qualities from yt-dlp format list
      let qualities = parseAvailableQualities(data.formats || [], duration);

      // If no video formats with height discovered, probe direct file with ffprobe
      if (qualities.length === 0) {
        try {
          const probe = await execProcess(
            FFPROBE_BIN,
            [
              '-v',
              'error',
              '-select_streams',
              'v:0',
              '-show_entries',
              'stream=height,width:format=size',
              '-of',
              'json',
              url,
            ],
            { timeoutMs: 10000 }
          );
          if (probe.code === 0 && probe.stdout.trim()) {
            const probeData = JSON.parse(probe.stdout);
            const height = probeData.streams?.[0]?.height;
            const sizeStr = probeData.format?.size;
            const fileSize = sizeStr ? parseInt(sizeStr, 10) : undefined;
            if (typeof height === 'number' && height > 0) {
              qualities.push({
                height,
                label: getQualityLabel(height),
                filesize: fileSize,
                formattedSize: formatBytes(fileSize),
              });
            }
          }
        } catch {
          // ignore
        }
      }

      // If still empty (e.g. standard audio/video direct stream), provide standard default
      if (qualities.length === 0) {
        qualities = [
          {
            height: 720,
            label: '720p HD',
          },
        ];
      }

      const defaultQuality = pickDefaultQuality(qualities);

      return {
        valid: true,
        url,
        title,
        duration,
        formattedDuration: formatSeconds(duration),
        thumbnail,
        uploader,
        platform: data.extractor_key || 'video',
        qualities,
        defaultQuality,
      };
    }
  } catch (err) {
    console.warn('yt-dlp metadata extraction failed, trying ffprobe:', err);
  }

  // Strategy 2: ffprobe (for direct video links)
  try {
    const { stdout, code } = await execProcess(
      FFPROBE_BIN,
      [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'format=duration,format_name,size:stream=height,width,codec_name',
        '-of',
        'json',
        url,
      ],
      { timeoutMs: 20000 }
    );

    if (code === 0 && stdout.trim()) {
      const data = JSON.parse(stdout);
      const durationStr = data.format?.duration;
      const duration = durationStr ? Math.round(parseFloat(durationStr)) : 0;
      const height = data.streams?.[0]?.height || 720;
      const sizeStr = data.format?.size;
      const fileSize = sizeStr ? parseInt(sizeStr, 10) : undefined;

      let title = 'Direct Video';
      try {
        const u = new URL(url);
        const base = path.basename(u.pathname);
        if (base) title = base;
      } catch {
        // default
      }

      const qualities: VideoQuality[] = [
        {
          height,
          label: getQualityLabel(height),
          filesize: fileSize,
          formattedSize: formatBytes(fileSize),
        },
      ];

      return {
        valid: true,
        url,
        title,
        duration,
        formattedDuration: formatSeconds(duration),
        uploader: 'Direct Link',
        platform: 'direct',
        qualities,
        defaultQuality: height,
      };
    }
  } catch (err) {
    console.error('ffprobe metadata extraction failed:', err);
  }

  throw new Error('Unable to inspect video. Please verify the URL is accessible and not private or protected.');
}

/**
 * Clean string for safe filenames
 */
export function sanitizeFilename(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').substring(0, 50);
  return sanitized || 'video';
}

/**
 * Trims and downloads video clip or full video asynchronously
 */
export async function processVideoJob(jobId: string): Promise<void> {
  const job = jobManager.getJob(jobId);
  if (!job) return;

  jobManager.updateJob(jobId, {
    status: 'processing',
    step: job.isFullVideo ? 'Processing video...' : 'Processing video clip...',
    progress: 10,
  });

  const baseFileName = sanitizeFilename(job.title);
  const suffix = job.isFullVideo ? 'full' : 'clip';
  const finalFileName = `${baseFileName}_${suffix}_${job.id.substring(0, 8)}.mp4`;
  const outputPath = path.join(TEMP_DIR, `video_${job.id}.mp4`);

  try {
    // Construct quality selector
    const q = job.selectedQuality;
    const formatSelector = q
      ? `bestvideo[height<=${q}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${q}]+bestaudio/best[height<=${q}]/best`
      : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best';

    jobManager.updateJob(jobId, {
      step: job.isFullVideo ? 'Downloading and merging video streams...' : 'Extracting video segment with FFmpeg...',
      progress: 25,
    });

    const ytDlpArgs: string[] = ['-f', formatSelector, '--merge-output-format', 'mp4', '--no-playlist'];

    if (!job.isFullVideo && job.startTime && job.endTime) {
      const timeSection = `*${job.startTime}-${job.endTime}`;
      ytDlpArgs.push('--download-sections', timeSection, '--force-keyframes-at-cuts');
    }

    ytDlpArgs.push('-o', outputPath, job.url);

    let success = false;
    try {
      const res = await execProcess(YT_DLP_BIN, ytDlpArgs, {
        timeoutMs: 300000, // 5 minutes timeout for download and processing
        onProgress: (text) => {
          if (text.includes('[download]')) {
            const match = text.match(/(\d+(\.\d+)?)%/);
            if (match) {
              const p = parseFloat(match[1]);
              jobManager.updateJob(jobId, {
                progress: Math.min(85, Math.floor(25 + p * 0.6)),
                step: `Downloading stream (${Math.floor(p)}%)...`,
              });
            }
          } else if (text.includes('[Merger]') || text.includes('ffmpeg')) {
            jobManager.updateJob(jobId, {
              progress: 90,
              step: 'Merging audio and video with FFmpeg...',
            });
          }
        },
      });

      if (res.code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        success = true;
      }
    } catch (ytErr) {
      console.warn(`yt-dlp processing failed for job ${jobId}, falling back to direct ffmpeg:`, ytErr);
    }

    // Strategy 2: Direct FFmpeg cut/stream fallback
    if (!success) {
      jobManager.updateJob(jobId, {
        step: 'Processing stream directly with FFmpeg...',
        progress: 50,
      });

      const ffmpegArgs: string[] = ['-y'];

      if (!job.isFullVideo && typeof job.startSeconds === 'number' && typeof job.endSeconds === 'number') {
        ffmpegArgs.push('-ss', job.startSeconds.toString(), '-to', job.endSeconds.toString());
      }

      ffmpegArgs.push(
        '-i',
        job.url,
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '23',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        outputPath
      );

      const res = await execProcess(FFMPEG_BIN, ffmpegArgs, {
        timeoutMs: 300000,
      });

      if (res.code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        success = true;
      } else {
        throw new Error(
          `FFmpeg processing failed with exit code ${res.code}. ${res.stderr.slice(-300) || 'Unknown error'}`
        );
      }
    }

    // Verify final file
    if (!fs.existsSync(outputPath)) {
      throw new Error('Generated video file could not be located on disk.');
    }

    const stat = fs.statSync(outputPath);
    if (stat.size === 0) {
      throw new Error('Generated video file is empty.');
    }

    jobManager.updateJob(jobId, {
      status: 'completed',
      step: 'Download completed.',
      progress: 100,
      outputPath,
      fileName: finalFileName,
      fileSize: stat.size,
      completedAt: Date.now(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`Error processing job ${jobId}:`, errorMsg);

    // Clean up partial file if exists
    if (fs.existsSync(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
      } catch {
        // ignore
      }
    }

    jobManager.updateJob(jobId, {
      status: 'failed',
      step: 'Processing failed.',
      progress: 0,
      error: errorMsg || 'An unexpected error occurred while processing the video.',
    });
  }
}
