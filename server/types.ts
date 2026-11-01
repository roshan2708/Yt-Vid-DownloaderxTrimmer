export type JobStatus = 'validating' | 'queued' | 'processing' | 'completed' | 'failed';

export interface VideoMetadata {
  valid: boolean;
  url: string;
  title: string;
  duration: number; // in seconds
  formattedDuration: string; // HH:MM:SS
  thumbnail?: string;
  uploader?: string;
  platform?: string;
}

export interface Job {
  id: string;
  url: string;
  title: string;
  startTime: string;
  endTime: string;
  startSeconds: number;
  endSeconds: number;
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
