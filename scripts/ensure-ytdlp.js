#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const binDir = path.resolve(__dirname, '..', 'bin');
const ytdlpPath = path.join(binDir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const ffmpegPath = path.join(binDir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
const ffprobePath = path.join(binDir, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');

function isCommandAvailable(cmd) {
  try {
    const check = process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`;
    execSync(check, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
        }

        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(dest));
        });
        file.on('error', (err) => {
          fs.unlink(dest, () => reject(err));
        });
      })
      .on('error', reject);
  });
}

async function ensureBinaries() {
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  // 1. Ensure yt-dlp
  if (fs.existsSync(ytdlpPath) && fs.statSync(ytdlpPath).size > 100000) {
    if (process.platform !== 'win32') {
      try { fs.chmodSync(ytdlpPath, 0o755); } catch {}
    }
    console.log(`[Cut Tadaao] yt-dlp is ready at ${ytdlpPath}`);
  } else if (isCommandAvailable('yt-dlp')) {
    console.log('[Cut Tadaao] System yt-dlp is available.');
  } else {
    console.log('[Cut Tadaao] Downloading standalone yt-dlp binary...');
    let downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
    if (process.platform === 'win32') {
      downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    } else if (process.platform === 'linux') {
      downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
    } else if (process.platform === 'darwin') {
      downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
    }

    try {
      await downloadFile(downloadUrl, ytdlpPath);
      if (process.platform !== 'win32') {
        fs.chmodSync(ytdlpPath, 0o755);
      }
      console.log(`[Cut Tadaao] Successfully installed yt-dlp to ${ytdlpPath}`);
    } catch (err) {
      console.warn('[Cut Tadaao] Failed to download standalone yt-dlp:', err.message);
      // Fallback to generic zipapp yt-dlp
      if (downloadUrl !== 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp') {
        try {
          await downloadFile('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp', ytdlpPath);
          if (process.platform !== 'win32') {
            fs.chmodSync(ytdlpPath, 0o755);
          }
        } catch (e) {
          console.warn('[Cut Tadaao] Fallback download failed:', e.message);
        }
      }
    }
  }

  // 2. Ensure ffmpeg & ffprobe on Linux if missing
  if (!isCommandAvailable('ffmpeg') && !fs.existsSync(ffmpegPath) && process.platform === 'linux') {
    console.log('[Cut Tadaao] ffmpeg not found on system. Installing static ffmpeg binary for Linux...');
    try {
      const zlib = require('zlib');
      // Use ffbinaries static builds
      const ffmpegUrl = 'https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v6.1/ffmpeg-6.1-linux-64.zip';
      const zipPath = path.join(binDir, 'ffmpeg.zip');
      await downloadFile(ffmpegUrl, zipPath);

      // Unzip using unzip command if present, or python3
      try {
        execSync(`unzip -o "${zipPath}" -d "${binDir}" && chmod 755 "${ffmpegPath}"`, { stdio: 'ignore' });
      } catch {
        execSync(`python3 -m zipfile -e "${zipPath}" "${binDir}" && chmod 755 "${ffmpegPath}"`, { stdio: 'ignore' });
      }
      fs.unlinkSync(zipPath);
      console.log('[Cut Tadaao] Successfully installed static ffmpeg.');
    } catch (e) {
      console.warn('[Cut Tadaao] Could not download static ffmpeg:', e.message);
    }
  }

  if (!isCommandAvailable('ffprobe') && !fs.existsSync(ffprobePath) && process.platform === 'linux') {
    console.log('[Cut Tadaao] ffprobe not found on system. Installing static ffprobe binary for Linux...');
    try {
      const ffprobeUrl = 'https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v6.1/ffprobe-6.1-linux-64.zip';
      const zipPath = path.join(binDir, 'ffprobe.zip');
      await downloadFile(ffprobeUrl, zipPath);
      try {
        execSync(`unzip -o "${zipPath}" -d "${binDir}" && chmod 755 "${ffprobePath}"`, { stdio: 'ignore' });
      } catch {
        execSync(`python3 -m zipfile -e "${zipPath}" "${binDir}" && chmod 755 "${ffprobePath}"`, { stdio: 'ignore' });
      }
      fs.unlinkSync(zipPath);
      console.log('[Cut Tadaao] Successfully installed static ffprobe.');
    } catch (e) {
      console.warn('[Cut Tadaao] Could not download static ffprobe:', e.message);
    }
  }
}

if (require.main === module) {
  ensureBinaries().catch((e) => console.error(e));
}

module.exports = { ensureBinaries, ytdlpPath, ffmpegPath, ffprobePath };
