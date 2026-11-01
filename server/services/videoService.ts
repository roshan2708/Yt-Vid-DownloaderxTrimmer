import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Job, VideoMetadata } from '../types';
import { formatSeconds } from '../utils/validator';
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

/**
 * Fetches video metadata via yt-dlp, with fallback to ffprobe
 */
export async function fetchVideoMetadata(url: string): Promise<VideoMetadata> {
  // Strategy 1: yt-dlp
  try {
    const { stdout, stderr, code } = await execProcess(
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

      // If duration is 0, try ffprobe to get duration for direct videos
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
          // ignore probe error
        }
      }

      return {
        valid: true,
        url,
        title,
        duration,
        formattedDuration: formatSeconds(duration),
        thumbnail,
        uploader,
        platform: data.extractor_key || 'video',
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
        '-show_entries',
        'format=duration,format_name,size:stream=codec_type,codec_name',
        '-of',
        'json',
        url,
      ],
      { timeoutMs: 20000 }
    );

    if (code === 0 && stdout.trim()) {
      const data = JSON.parse(stdout);
      const durationStr = data.format?.duration;
      const duration = durationStr ? parseFloat(durationStr) : 0;

      // Extract filename from URL
      let title = 'Direct Video';
      try {
        const u = new URL(url);
        const base = path.basename(u.pathname);
        if (base) title = base;
      } catch {
        // use default
      }

      return {
        valid: true,
        url,
        title,
        duration,
        formattedDuration: formatSeconds(duration),
        uploader: 'Direct Link',
        platform: 'direct',
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
  return sanitized || 'video_clip';
}

/**
 * Trims and downloads video clip asynchronously
 */
export async function processVideoJob(jobId: string): Promise<void> {
  const job = jobManager.getJob(jobId);
  if (!job) return;

  jobManager.updateJob(jobId, {
    status: 'processing',
    step: 'Processing video...',
    progress: 10,
  });

  const baseFileName = sanitizeFilename(job.title);
  const finalFileName = `${baseFileName}_${job.id.substring(0, 8)}.mp4`;
  const outputPath = path.join(TEMP_DIR, `clip_${job.id}.mp4`);

  try {
    // Strategy 1: yt-dlp with --download-sections and keyframe cut
    jobManager.updateJob(jobId, {
      step: 'Extracting video segment with FFmpeg...',
      progress: 30,
    });

    const timeSection = `*${job.startTime}-${job.endTime}`;
    const ytDlpArgs = [
      '--download-sections',
      timeSection,
      '--force-keyframes-at-cuts',
      '-f',
      'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format',
      'mp4',
      '--no-playlist',
      '-o',
      outputPath,
      job.url,
    ];

    let success = false;
    try {
      const res = await execProcess(YT_DLP_BIN, ytDlpArgs, {
        timeoutMs: 180000, // 3 minutes timeout for trim
        onProgress: (text) => {
          if (text.includes('[download]')) {
            const match = text.match(/(\d+(\.\d+)?)%/);
            if (match) {
              const p = parseFloat(match[1]);
              jobManager.updateJob(jobId, {
                progress: Math.min(85, Math.floor(30 + p * 0.5)),
                step: `Downloading clip segment (${Math.floor(p)}%)...`,
              });
            }
          }
        },
      });

      if (res.code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        success = true;
      }
    } catch (ytErr) {
      console.warn(`yt-dlp section download failed for job ${jobId}, falling back to direct ffmpeg:`, ytErr);
    }

    // Strategy 2: Direct FFmpeg cut (especially for direct video links or when yt-dlp section fails)
    if (!success) {
      jobManager.updateJob(jobId, {
        step: 'Trimming via FFmpeg direct stream...',
        progress: 50,
      });

      const ffmpegArgs = [
        '-y',
        '-ss',
        job.startSeconds.toString(),
        '-to',
        job.endSeconds.toString(),
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
        outputPath,
      ];

      const res = await execProcess(FFMPEG_BIN, ffmpegArgs, {
        timeoutMs: 180000,
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
      throw new Error('Generated clip file could not be located on disk.');
    }

    const stat = fs.statSync(outputPath);
    if (stat.size === 0) {
      throw new Error('Generated clip file is empty.');
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
