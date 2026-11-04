import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Job } from '../types';

export const DISK_TEMP_DIR = path.resolve(process.cwd(), 'server', 'temp');
if (!fs.existsSync(DISK_TEMP_DIR)) {
  fs.mkdirSync(DISK_TEMP_DIR, { recursive: true });
}

// High-speed RAM disk support: On Linux, use /dev/shm for near-instant I/O on clips
export const RAM_TEMP_DIR = (() => {
  if (process.platform === 'linux' && fs.existsSync('/dev/shm')) {
    const shmDir = path.join('/dev/shm', 'clipdown_temp');
    try {
      if (!fs.existsSync(shmDir)) {
        fs.mkdirSync(shmDir, { recursive: true });
      }
      return shmDir;
    } catch {
      // Fallback if permission denied
    }
  }
  return DISK_TEMP_DIR;
})();

export const TEMP_DIR = RAM_TEMP_DIR;

export function getTempDir(isFullVideo = false): string {
  // Full videos go to SSD disk to protect RAM; clips go to lightning-fast RAM disk
  return isFullVideo ? DISK_TEMP_DIR : RAM_TEMP_DIR;
}

class JobManager {
  private jobs = new Map<string, Job>();
  private readonly EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cleanOrphanedFiles();
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupExpiredJobs(), 5 * 60 * 1000);
  }

  public createJob(params: {
    url: string;
    title: string;
    startTime?: string;
    endTime?: string;
    startSeconds?: number;
    endSeconds?: number;
    isFullVideo: boolean;
    selectedQuality?: number;
    userId?: string;
    quotaConsumed?: boolean;
    quotaSource?: 'daily' | 'monthly' | 'bonus';
  }): Job {
    const id = uuidv4();
    const job: Job = {
      id,
      url: params.url,
      title: params.title || 'video',
      startTime: params.startTime,
      endTime: params.endTime,
      startSeconds: params.startSeconds,
      endSeconds: params.endSeconds,
      isFullVideo: params.isFullVideo,
      selectedQuality: params.selectedQuality,
      userId: params.userId,
      quotaConsumed: params.quotaConsumed,
      quotaSource: params.quotaSource,
      status: 'queued',
      step: 'Queued for processing...',
      progress: 0,
      createdAt: Date.now(),
    };

    this.jobs.set(id, job);
    return job;
  }

  public getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  public getAllJobs(): Job[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public updateJob(id: string, updates: Partial<Job>): Job | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    const updatedJob: Job = { ...job, ...updates };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  public deleteJobFile(id: string): void {
    const job = this.jobs.get(id);
    if (job?.outputPath && fs.existsSync(job.outputPath)) {
      try {
        fs.unlinkSync(job.outputPath);
      } catch (err) {
        console.error(`Failed to delete file for job ${id}:`, err);
      }
    }
  }

  public cleanupExpiredJobs(): void {
    const now = Date.now();
    for (const [id, job] of this.jobs.entries()) {
      if (now - job.createdAt > this.EXPIRY_MS) {
        this.deleteJobFile(id);
        this.jobs.delete(id);
      }
    }
  }

  public cleanOrphanedFiles(): void {
    const dirsToClean = new Set([DISK_TEMP_DIR, RAM_TEMP_DIR]);
    const now = Date.now();

    for (const dir of dirsToClean) {
      try {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file === '.gitkeep') continue;
          const filePath = path.join(dir, file);
          try {
            const stats = fs.statSync(filePath);
            // If file is older than 30 minutes, remove it
            if (now - stats.mtimeMs > this.EXPIRY_MS) {
              fs.unlinkSync(filePath);
            }
          } catch {
            // ignore stat errors
          }
        }
      } catch (err) {
        console.error(`Error cleaning orphaned files in ${dir}:`, err);
      }
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const jobManager = new JobManager();
