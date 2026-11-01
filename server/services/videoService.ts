import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Job, VideoMetadata, VideoQuality } from '../types';
import { formatBytes, formatSeconds, getQualityLabel } from '../utils/validator';
import { jobManager, TEMP_DIR } from './jobManager';

// Candidate paths for binaries
const localBinDir = path.resolve(process.cwd(), 'bin');
const localYtDlp = path.join(localBinDir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const localFfmpeg = path.join(localBinDir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
const localFfprobe = path.join(localBinDir, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');

const YT_DLP_CANDIDATES = [
  localYtDlp,
  '/usr/local/bin/yt-dlp',
  '/usr/bin/yt-dlp',
  '/opt/homebrew/bin/yt-dlp',
  'yt-dlp',
];

const FFMPEG_CANDIDATES = [
  localFfmpeg,
  '/usr/bin/ffmpeg',
  '/usr/local/bin/ffmpeg',
  '/opt/homebrew/bin/ffmpeg',
  'ffmpeg',
];

const FFPROBE_CANDIDATES = [
  localFfprobe,
  '/usr/bin/ffprobe',
  '/usr/local/bin/ffprobe',
  '/opt/homebrew/bin/ffprobe',
  'ffprobe',
];

let autoInstalled = false;

function ensureBinariesPresent(): void {
  if (autoInstalled) return;
  autoInstalled = true;
  try {
    const scriptPath = path.resolve(__dirname, '../../scripts/ensure-ytdlp.js');
    if (fs.existsSync(scriptPath)) {
      const { execSync } = require('child_process');
      execSync(`node "${scriptPath}"`, { stdio: 'inherit', timeout: 90000 });
    }
  } catch (e) {
    console.warn('[ClipDown] Dynamic ensure-ytdlp failed:', e);
  }
}

function resolveBinary(candidates: string[]): string {
  for (const bin of candidates) {
    if (bin.startsWith('/') || bin.includes(':\\')) {
      if (fs.existsSync(bin)) return bin;
    }
  }

  // If local binary doesn't exist and on production, try ensuring binaries
  if (!autoInstalled) {
    ensureBinariesPresent();
    for (const bin of candidates) {
      if (bin.startsWith('/') || bin.includes(':\\')) {
        if (fs.existsSync(bin)) return bin;
      }
    }
  }

  return candidates[candidates.length - 1]; // fallback to naked command (uses PATH)
}

export function getYtDlpBin(): string {
  return resolveBinary(YT_DLP_CANDIDATES);
}

export function getFfmpegBin(): string {
  return resolveBinary(FFMPEG_CANDIDATES);
}

export function getFfprobeBin(): string {
  return resolveBinary(FFPROBE_CANDIDATES);
}

/**
 * Helper to resolve cookies file from env or disk
 */
export function getCookieFilePath(): string | null {
  if (process.env.COOKIES_FILE && fs.existsSync(process.env.COOKIES_FILE)) {
    return process.env.COOKIES_FILE;
  }
  const localCookies = path.resolve(process.cwd(), 'cookies.txt');
  if (fs.existsSync(localCookies)) {
    return localCookies;
  }
  const envCookies = process.env.YOUTUBE_COOKIES || process.env.COOKIES_CONTENT;
  if (envCookies && envCookies.trim().length > 10) {
    const tempCookiesPath = path.join(TEMP_DIR, 'youtube_cookies.txt');
    try {
      let content = envCookies.trim();
      if (content.startsWith('base64:')) {
        content = Buffer.from(content.slice(7), 'base64').toString('utf-8');
      }
      fs.writeFileSync(tempCookiesPath, content, { encoding: 'utf-8' });
      return tempCookiesPath;
    } catch (e) {
      console.warn('[ClipDown] Failed to write cookies from env:', e);
    }
  }
  return null;
}

/**
 * Standard yt-dlp arguments optimized for datacenter and bypass
 */
export function getYtDlpCommonArgs(client = 'web_embedded,android'): string[] {
  const args = [
    '--no-warnings',
    '--no-playlist',
    '--no-check-certificates',
    '--geo-bypass',
    '--socket-timeout',
    '20',
    '--extractor-args',
    `youtube:player_client=${client}`,
    '--user-agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];

  const proxy = process.env.PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  if (proxy) {
    args.push('--proxy', proxy);
  }

  const cookieFile = getCookieFilePath();
  if (cookieFile) {
    args.push('--cookies', cookieFile);
  }

  return args;
}

/**
 * Execute command with promise
 */
function execProcess(
  cmd: string,
  args: string[],
  options?: { onProgress?: (text: string) => void; timeoutMs?: number }
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFfmpegBin();
    const ffmpegDir = path.dirname(ffmpegPath);

    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: `${localBinDir}:${ffmpegDir}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
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
  let bestAudioSize = 0;
  for (const f of formats) {
    if (f.vcodec === 'none' && f.acodec !== 'none') {
      const size = f.filesize || f.filesize_approx;
      if (size && size > bestAudioSize) {
        bestAudioSize = size;
      }
    }
  }

  const heightMap = new Map<number, { formatId?: string; filesize?: number }>();

  for (const f of formats) {
    if (f.vcodec !== 'none' && typeof f.height === 'number' && f.height > 0) {
      const h = f.height;
      let calculatedSize = f.filesize || f.filesize_approx;

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

  qualities.sort((a, b) => b.height - a.height);
  return qualities;
}

function pickDefaultQuality(qualities: VideoQuality[]): number | undefined {
  if (qualities.length === 0) return undefined;

  const has720 = qualities.find((q) => q.height === 720);
  if (has720) return 720;

  const upTo720 = qualities.filter((q) => q.height <= 720);
  if (upTo720.length > 0) {
    return upTo720[0].height;
  }

  return qualities[qualities.length - 1].height;
}

/**
 * Fetches video metadata via yt-dlp, with fallback to ffprobe
 */
export async function fetchVideoMetadata(url: string): Promise<VideoMetadata> {
  const ytDlpBin = getYtDlpBin();
  const ffprobeBin = getFfprobeBin();

  let ytDlpStderr = '';
  let ytDlpErrorObj: Error | null = null;

  // Strategy 1: yt-dlp with multi-client bypass fallback
  const candidateClients = ['web_embedded,android', 'mweb,android', 'tv,android', 'android,web'];

  for (const client of candidateClients) {
    try {
      const ytDlpArgs = [
        '--dump-single-json',
        ...getYtDlpCommonArgs(client),
        url,
      ];

      const { stdout, stderr, code } = await execProcess(ytDlpBin, ytDlpArgs, { timeoutMs: 30000 });
      ytDlpStderr = stderr;

      if (code === 0 && stdout.trim()) {
        const data = JSON.parse(stdout);
        let duration = typeof data.duration === 'number' ? data.duration : 0;
        const title = data.title || 'Video';
        const thumbnail =
          data.thumbnail ||
          (Array.isArray(data.thumbnails) && data.thumbnails.length > 0
            ? data.thumbnails[data.thumbnails.length - 1].url
            : undefined);
        const uploader = data.uploader || data.channel || data.extractor || '';

        // If duration is 0, query ffprobe for duration for direct links
        if (duration === 0) {
          try {
            const probe = await execProcess(
              ffprobeBin,
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

        let qualities = parseAvailableQualities(data.formats || [], duration);

        // If no video formats discovered, probe direct file with ffprobe
        if (qualities.length === 0) {
          try {
            const probe = await execProcess(
              ffprobeBin,
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

      // If error is not bot verification, no need to cycle through all clients
      if (!stderr.includes('bot') && !stderr.includes('Sign in')) {
        break;
      }
    } catch (err: unknown) {
      ytDlpErrorObj = err instanceof Error ? err : new Error(String(err));
      console.warn(`[ClipDown] yt-dlp with client ${client} failed:`, ytDlpErrorObj.message);
    }
  }

  // Strategy 2: ffprobe (for direct video links)
  try {
    const { stdout, code } = await execProcess(
      ffprobeBin,
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
  } catch (probeErr: unknown) {
    console.error('[ClipDown] ffprobe metadata extraction failed:', probeErr);
  }

  // Generate actionable error message from stderr/error
  const fullErrorText = `${ytDlpStderr} ${ytDlpErrorObj?.message || ''}`.trim();
  console.error('[ClipDown] Video inspection failed details:', fullErrorText);

  if (fullErrorText.includes('bot') || fullErrorText.includes('Sign in to confirm')) {
    throw new Error(
      'YouTube bot verification triggered on cloud server. Please configure YOUTUBE_COOKIES in Render Environment Variables or try another video.'
    );
  }
  if (fullErrorText.includes('Private video') || fullErrorText.includes('Sign in')) {
    throw new Error('This video is private or restricted and cannot be downloaded.');
  }
  if (fullErrorText.includes('Video unavailable') || fullErrorText.includes('does not exist')) {
    throw new Error('Video is unavailable or has been removed.');
  }
  if (fullErrorText.includes('ENOENT') || fullErrorText.includes('not found')) {
    throw new Error('Media extraction tool (yt-dlp/ffmpeg) is not installed on the server. Please check deployment instructions.');
  }

  // Extract primary ERROR: line if available
  const errorLines = ytDlpStderr.split('\n').filter((l) => l.includes('ERROR:') || l.includes('HTTP Error'));
  if (errorLines.length > 0) {
    throw new Error(errorLines[0].replace(/^ERROR:\s*/, '').trim());
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

  const ytDlpBin = getYtDlpBin();
  const ffmpegBin = getFfmpegBin();

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
    const q = job.selectedQuality;
    const formatSelector = q
      ? `bestvideo[height<=${q}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${q}]+bestaudio/best[height<=${q}]/best`
      : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best';

    jobManager.updateJob(jobId, {
      step: job.isFullVideo ? 'Downloading and merging video streams...' : 'Extracting video segment with FFmpeg...',
      progress: 25,
    });

    const ytDlpArgs: string[] = [
      '-f',
      formatSelector,
      '--merge-output-format',
      'mp4',
      ...getYtDlpCommonArgs('web_embedded,android'),
      '--ffmpeg-location',
      path.dirname(ffmpegBin),
    ];

    if (!job.isFullVideo && job.startTime && job.endTime) {
      const timeSection = `*${job.startTime}-${job.endTime}`;
      ytDlpArgs.push('--download-sections', timeSection, '--force-keyframes-at-cuts');
    }

    ytDlpArgs.push('-o', outputPath, job.url);

    let success = false;
    try {
      const res = await execProcess(ytDlpBin, ytDlpArgs, {
        timeoutMs: 300000,
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

      const res = await execProcess(ffmpegBin, ffmpegArgs, {
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
