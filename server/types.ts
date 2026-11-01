export type JobStatus = 'validating' | 'queued' | 'processing' | 'completed' | 'failed';

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
  status: JobStatus;
  step: string;
  progress: number;
  error?: string;
  outputPath?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: number;
  completedAt?: number;
}
