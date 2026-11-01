import { URL } from 'url';

// List of authorized platform hostnames
const AUTHORIZED_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'vimeo.com',
  'www.vimeo.com',
  'player.vimeo.com',
  'twitter.com',
  'www.twitter.com',
  'x.com',
  'www.x.com',
  'tiktok.com',
  'www.tiktok.com',
  'reddit.com',
  'www.reddit.com',
  'v.redd.it',
  'twitch.tv',
  'www.twitch.tv',
  'clips.twitch.tv',
  'dailymotion.com',
  'www.dailymotion.com',
  'dai.ly',
  'w3schools.com',
  'www.w3schools.com',
];

const DIRECT_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv', '.m4v'];

/**
 * Checks if an IP or hostname is private / loopback / internal to prevent SSRF
 */
function isInternalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower === '[::1]' ||
    lower === '0.0.0.0'
  ) {
    return true;
  }

  // IPv4 internal ranges
  const ipv4Match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octet1 = parseInt(ipv4Match[1], 10);
    const octet2 = parseInt(ipv4Match[2], 10);

    // 10.0.0.0/8
    if (octet1 === 10) return true;
    // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true;
    // 192.168.0.0/16
    if (octet1 === 192 && octet2 === 168) return true;
    // 169.254.0.0/16 (link-local, cloud metadata)
    if (octet1 === 169 && octet2 === 254) return true;
    // 127.0.0.0/8
    if (octet1 === 127) return true;
    // 0.0.0.0
    if (octet1 === 0) return true;
  }

  return false;
}

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
  normalizedUrl?: string;
  sourceType?: 'platform' | 'direct';
}

/**
 * Validates that the input is a valid public URL and matches authorized video sources
 */
export function validateVideoUrl(inputUrl: string): UrlValidationResult {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { isValid: false, error: 'URL is required.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(inputUrl.trim());
  } catch {
    return { isValid: false, error: 'Invalid URL format. Please provide a complete URL starting with https://' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, error: 'Only HTTP and HTTPS URLs are supported.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Prevent SSRF / internal access
  if (isInternalHost(hostname)) {
    return { isValid: false, error: 'Local and internal addresses are not permitted.' };
  }

  // Check if it belongs to an authorized platform
  const isAuthorizedPlatform = AUTHORIZED_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith('.' + d)
  );

  if (isAuthorizedPlatform) {
    return { isValid: true, normalizedUrl: parsed.href, sourceType: 'platform' };
  }

  // Check if it is a direct video URL ending with a supported extension
  const pathname = parsed.pathname.toLowerCase();
  const isDirectVideo = DIRECT_VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext));

  if (isDirectVideo) {
    return { isValid: true, normalizedUrl: parsed.href, sourceType: 'direct' };
  }

  return {
    isValid: false,
    error:
      'Unauthorized or unsupported video source. Supported sources include YouTube, Vimeo, Twitch, Reddit, X/Twitter, TikTok, Dailymotion, or direct .mp4/.webm video links.',
  };
}

/**
 * Parses timestamp string (HH:MM:SS, MM:SS, or seconds) into seconds
 */
export function parseTimestamp(ts: string): number | null {
  if (!ts || typeof ts !== 'string') return null;

  const trimmed = ts.trim();
  if (!trimmed) return null;

  // Plain seconds (e.g. "45" or "120.5")
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Math.max(0, parseFloat(trimmed));
  }

  const parts = trimmed.split(':').map((p) => parseFloat(p));
  if (parts.some((p) => isNaN(p) || p < 0)) {
    return null;
  }

  if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    // HH:MM:SS
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
}

/**
 * Formats seconds into HH:MM:SS
 */
export function formatSeconds(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';

  const secs = Math.floor(totalSeconds);
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const remainingSeconds = secs % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
}

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes?: number): string | undefined {
  if (!bytes || isNaN(bytes) || bytes <= 0) return undefined;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) {
    return `~${(mb / 1024).toFixed(1)} GB`;
  }
  if (mb >= 1) {
    return `~${mb.toFixed(1)} MB`;
  }
  return `~${Math.round(bytes / 1024)} KB`;
}

/**
 * Clean standard label for video resolutions
 */
export function getQualityLabel(height: number): string {
  switch (height) {
    case 2160:
      return '2160p 4K';
    case 1440:
      return '1440p 2K';
    case 1080:
      return '1080p Full HD';
    case 720:
      return '720p HD';
    case 480:
      return '480p';
    case 360:
      return '360p';
    case 240:
      return '240p';
    case 144:
      return '144p';
    default:
      return `${height}p`;
  }
}

export interface TimeRangeValidation {
  isValid: boolean;
  isFullVideo: boolean;
  error?: string;
  startSeconds?: number;
  endSeconds?: number;
  formattedStart?: string;
  formattedEnd?: string;
}

/**
 * Validates start and end time range with full video support:
 * - If both are empty: full video download
 * - If both are provided: clip download
 * - If only one is provided: error asking to enter both
 */
export function validateTimeRange(
  startTimeStr?: string,
  endTimeStr?: string,
  videoDuration?: number
): TimeRangeValidation {
  const hasStart = typeof startTimeStr === 'string' && startTimeStr.trim().length > 0;
  const hasEnd = typeof endTimeStr === 'string' && endTimeStr.trim().length > 0;

  // Case 1: Both empty -> Full Video Download
  if (!hasStart && !hasEnd) {
    return {
      isValid: true,
      isFullVideo: true,
      startSeconds: 0,
      endSeconds: videoDuration && videoDuration > 0 ? videoDuration : undefined,
      formattedStart: undefined,
      formattedEnd: undefined,
    };
  }

  // Case 2: Only one timestamp provided -> Validation Error
  if (hasStart && !hasEnd) {
    return {
      isValid: false,
      isFullVideo: false,
      error: 'Please enter both start and end timestamps, or leave both empty to download the full video.',
    };
  }

  if (!hasStart && hasEnd) {
    return {
      isValid: false,
      isFullVideo: false,
      error: 'Please enter both start and end timestamps, or leave both empty to download the full video.',
    };
  }

  // Case 3: Both timestamps provided -> Validate Segment
  const startSeconds = parseTimestamp(startTimeStr!);
  const endSeconds = parseTimestamp(endTimeStr!);

  if (startSeconds === null) {
    return {
      isValid: false,
      isFullVideo: false,
      error: 'Invalid start time format. Use HH:MM:SS (e.g., 00:00:00).',
    };
  }

  if (endSeconds === null) {
    return {
      isValid: false,
      isFullVideo: false,
      error: 'Invalid end time format. Use HH:MM:SS (e.g., 00:01:30).',
    };
  }

  if (startSeconds < 0) {
    return {
      isValid: false,
      isFullVideo: false,
      error: 'Start time cannot be negative.',
    };
  }

  if (endSeconds <= startSeconds) {
    return {
      isValid: false,
      isFullVideo: false,
      error: 'Start time must always be less than end time.',
    };
  }

  const duration = endSeconds - startSeconds;
  if (duration < 1) {
    return {
      isValid: false,
      isFullVideo: false,
      error: 'The selected clip must be at least 1 second long.',
    };
  }

  // Maximum clip limit (e.g., 30 minutes for single clip)
  const MAX_CLIP_SECONDS = 30 * 60;
  if (duration > MAX_CLIP_SECONDS) {
    return {
      isValid: false,
      isFullVideo: false,
      error: `Clip duration exceeds maximum allowed limit (${MAX_CLIP_SECONDS / 60} minutes).`,
    };
  }

  if (typeof videoDuration === 'number' && videoDuration > 0) {
    // Allow small 1-second margin for rounding
    if (endSeconds > videoDuration + 1) {
      return {
        isValid: false,
        isFullVideo: false,
        error: `End time (${formatSeconds(endSeconds)}) must not exceed the video duration (${formatSeconds(
          videoDuration
        )}).`,
      };
    }
  }

  return {
    isValid: true,
    isFullVideo: false,
    startSeconds,
    endSeconds,
    formattedStart: formatSeconds(startSeconds),
    formattedEnd: formatSeconds(endSeconds),
  };
}
