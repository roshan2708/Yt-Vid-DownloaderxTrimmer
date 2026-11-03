export type JobStatus = 'validating' | 'queued' | 'processing' | 'completed' | 'failed';

export type UserTier = 'free' | 'pro' | 'studio' | 'daypass';

export type QuotaCycle = 'daily' | 'monthly';

export interface TierConfig {
  name: string;
  quotaCycle: QuotaCycle;
  quotaLimit: number; // 3 for free, 200 for pro, 500 for studio
  maxQuality: number; // e.g. 720, 1080, 2160
  maxClipDurationSec: number; // in seconds
  maxSourceDurationSec: number; // in seconds
}

export interface UserQuotaRecord {
  userId: string;
  email?: string;
  tier: UserTier;
  trimsToday: number;
  lastResetDate: string; // YYYY-MM-DD UTC
  trimsThisMonth: number;
  lastResetMonth: string; // YYYY-MM UTC
  bonusCredits: number;
  totalTrimsAllTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserQuotaResponse {
  userId: string;
  tier: UserTier;
  tierName: string;
  quotaCycle: QuotaCycle;
  quotaLimit: number;
  quotaUsed: number;
  remainingQuota: number;
  bonusCredits: number;
  totalRemaining: number;
  secondsUntilReset: number;
  maxQuality: number;
  maxClipDurationSec: number;
  maxSourceDurationSec: number;
  // Backward compatibility convenience fields
  trimsToday: number;
  dailyLimit: number;
  remainingToday: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  consumedFrom?: 'daily' | 'monthly' | 'bonus';
  code?: 'LIMIT_REACHED' | 'QUALITY_RESTRICTED' | 'DURATION_RESTRICTED' | 'SOURCE_RESTRICTED';
  reason?: string;
  resetInSeconds?: number;
}

export interface VideoQuality {
  height: number;
  label: string; // e.g. "1080p Full HD", "720p HD", "480p", "360p"
  filesize?: number; // bytes
  formattedSize?: string; // e.g. "~45.2 MB"
  formatId?: string;
}

export interface VideoMetadata {
  valid: boolean;
  url: string;
  title: string;
  duration: number; // in seconds
  formattedDuration: string; // HH:MM:SS
  thumbnail?: string;
  uploader?: string;
  platform?: string;
  qualities: VideoQuality[];
  defaultQuality?: number; // e.g. 720
  error?: string;
}

export interface Job {
  id: string;
  url: string;
  title: string;
  startTime?: string;
  endTime?: string;
  startSeconds?: number;
  endSeconds?: number;
  isFullVideo: boolean;
  selectedQuality?: number; // height, e.g. 720, 1080
  userId?: string;
  status: JobStatus;
  step: string;
  progress: number;
  error?: string;
  outputPath?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: number;
  completedAt?: number;
  quotaConsumed?: boolean;
  quotaSource?: 'daily' | 'monthly' | 'bonus';
  quotaRefunded?: boolean;
}
