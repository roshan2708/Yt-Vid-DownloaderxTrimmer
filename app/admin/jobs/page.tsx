'use client';

import React, { useEffect, useState } from 'react';
import { getCurrentIdToken } from '@/src/lib/auth';

interface JobItem {
  id: string;
  url: string;
  title: string;
  startTime?: string;
  endTime?: string;
  isFullVideo: boolean;
  selectedQuality?: number;
  userId?: string;
  status: 'validating' | 'queued' | 'processing' | 'completed' | 'failed';
  step: string;
  progress: number;
  error?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: number;
  completedAt?: number;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);

  const fetchJobs = async () => {
    try {
      const token = await getCurrentIdToken();
      if (!token) return;

      const res = await fetch('/api/admin/jobs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Failed to query jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    if (!autoRefresh) return;
    const interval = setInterval(fetchJobs, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleCancelJob = async (jobId: string) => {
    if (!confirm(`Are you sure you want to abort job ${jobId}?`)) return;

    try {
      const token = await getCurrentIdToken();
      if (!token) return;

      await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'CANCEL_JOB', jobId }),
      });
      fetchJobs();
    } catch {
      alert('Failed to cancel job');
    }
  };

  const handleCleanCache = async () => {
    try {
      const token = await getCurrentIdToken();
      if (!token) return;

      const res = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'CLEAN_ORPHANED_FILES' }),
      });
      if (res.ok) {
        alert('Cache files cleaned successfully.');
        fetchJobs();
      }
    } catch {
      alert('Cleanup failed');
    }
  };

  const activeCount = jobs.filter((j) => j.status === 'processing' || j.status === 'queued').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Active Queue & Job Telemetry</h1>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-950 border border-red-800 text-red-400 text-xs font-bold animate-pulse">
                {activeCount} active
              </span>
            )}
          </div>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Real-time FFmpeg processing pipeline, memory disk queue, and worker threads
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded accent-red-600"
            />
            <span>Auto Refresh (4s)</span>
          </label>

          <button
            onClick={handleCleanCache}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors"
          >
            Clear Stale Cache
          </button>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 font-mono uppercase text-[10px] bg-neutral-950/40">
                <th className="py-3.5 px-4">Job ID</th>
                <th className="py-3.5 px-4">Video / Task</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Quality</th>
                <th className="py-3.5 px-4">Status & Step</th>
                <th className="py-3.5 px-4">Progress</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-neutral-300">
                    {job.id.slice(0, 8)}...
                  </td>

                  <td className="py-3.5 px-4 max-w-xs font-sans">
                    <p className="font-semibold text-white truncate">{job.title || 'Video'}</p>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-neutral-500 hover:text-neutral-400 truncate block"
                    >
                      {job.url}
                    </a>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        job.isFullVideo
                          ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                          : 'bg-red-950 text-red-300 border border-red-800/60'
                      }`}
                    >
                      {job.isFullVideo ? 'Full Video' : 'Trim Clip'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-neutral-300 font-semibold">
                    {job.selectedQuality ? `${job.selectedQuality}p` : 'Auto'}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          job.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                            : job.status === 'processing'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800/50 animate-pulse'
                            : job.status === 'failed'
                            ? 'bg-red-950 text-red-400 border border-red-800/50'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {job.status === 'processing' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />}
                        {job.status}
                      </span>
                      <p className="text-[11px] text-neutral-500 truncate max-w-xs font-sans">{job.step}</p>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="w-24 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-neutral-400">{job.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                        <div
                          style={{ width: `${job.progress}%` }}
                          className={`h-full rounded-full transition-all ${
                            job.status === 'completed'
                              ? 'bg-emerald-500'
                              : job.status === 'failed'
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {job.error && (
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-800/60 text-red-300 text-[11px] font-semibold"
                        >
                          Error Log
                        </button>
                      )}

                      {(job.status === 'processing' || job.status === 'queued') && (
                        <button
                          onClick={() => handleCancelJob(job.id)}
                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold"
                        >
                          Abort
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {jobs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500 font-sans">
                    No active or recent jobs found in the worker memory queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Job Error Diagnostics
              </h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-neutral-400">
                Job ID: <strong className="text-neutral-200 font-mono">{selectedJob.id}</strong>
              </p>
              <p className="text-neutral-400">
                Target URL: <strong className="text-neutral-200 font-mono break-all">{selectedJob.url}</strong>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
              <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-2">Error Stderr Output:</p>
              <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap break-all max-h-60 overflow-y-auto leading-relaxed">
                {selectedJob.error || 'No error details recorded.'}
              </pre>
            </div>

            <button
              onClick={() => setSelectedJob(null)}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs transition-colors"
            >
              Close Diagnostics
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

