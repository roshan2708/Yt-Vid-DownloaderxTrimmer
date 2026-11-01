import { NextResponse } from 'next/server';
import { getYtDlpBin, getFfmpegBin, getFfprobeBin } from '@/server/services/videoService';
import { execSync } from 'child_process';
import fs from 'fs';

export async function GET() {
  let ytdlpPath = 'yt-dlp';
  let ffmpegPath = 'ffmpeg';
  let ffprobePath = 'ffprobe';

  try { ytdlpPath = getYtDlpBin(); } catch {}
  try { ffmpegPath = getFfmpegBin(); } catch {}
  try { ffprobePath = getFfprobeBin(); } catch {}

  let ytdlpVersion: string | null = null;
  let ffmpegVersion: string | null = null;
  let ffprobeVersion: string | null = null;

  const envPath = `${process.env.PATH || ''}:/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin`;

  try {
    ytdlpVersion = execSync(`${ytdlpPath} --version`, {
      timeout: 4000,
      env: { ...process.env, PATH: envPath },
    })
      .toString()
      .trim();
  } catch (err: unknown) {
    ytdlpVersion = err instanceof Error ? err.message : String(err);
  }

  try {
    const out = execSync(`${ffmpegPath} -version`, {
      timeout: 4000,
      env: { ...process.env, PATH: envPath },
    }).toString();
    ffmpegVersion = out.split('\n')[0];
  } catch (err: unknown) {
    ffmpegVersion = err instanceof Error ? err.message : String(err);
  }

  try {
    const out = execSync(`${ffprobePath} -version`, {
      timeout: 4000,
      env: { ...process.env, PATH: envPath },
    }).toString();
    ffprobeVersion = out.split('\n')[0];
  } catch (err: unknown) {
    ffprobeVersion = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    status: 'ok',
    environment: {
      nodeEnv: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    binaries: {
      ytdlp: {
        resolvedPath: ytdlpPath,
        existsOnDisk: fs.existsSync(/*turbopackIgnore: true*/ ytdlpPath),
        version: ytdlpVersion,
      },
      ffmpeg: {
        resolvedPath: ffmpegPath,
        existsOnDisk: fs.existsSync(/*turbopackIgnore: true*/ ffmpegPath),
        version: ffmpegVersion,
      },
      ffprobe: {
        resolvedPath: ffprobePath,
        existsOnDisk: fs.existsSync(/*turbopackIgnore: true*/ ffprobePath),
        version: ffprobeVersion,
      },
    },
  });
}
