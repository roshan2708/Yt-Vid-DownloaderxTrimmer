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
    if (!confirm(`Cancel job ${jobId}?`)) return;

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
        alert('Cache cleared.');
        fetchJobs();
      }
    } catch {
      alert('Cleanup failed');
    }
  };

  const activeCount = jobs.filter((j) => j.status === 'processing' || j.status === 'queued').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Job Processing Queue</h1>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium">
                {activeCount} active
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Active and recent video download tasks and worker statuses
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs text-neutral-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded accent-neutral-900"
            />
            <span>Auto Refresh</span>
          </label>

          <button
            onClick={handleCleanCache}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium border border-neutral-300 transition-colors"
          >
            Clear Cache
          </button>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="rounded-xl bg-white border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-medium">
                <th className="py-2.5 px-4">Job ID</th>
                <th className="py-2.5 px-4">Task Details</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Quality</th>
                <th className="py-2.5 px-4">Status & Step</th>
                <th className="py-2.5 px-4">Progress</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-neutral-500">
                    {job.id.slice(0, 8)}…
                  </td>

                  <td className="py-2.5 px-4 max-w-xs">
                    <p className="font-medium text-neutral-900 truncate">{job.title || 'Video'}</p>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-neutral-400 hover:text-neutral-600 truncate block"
                    >
                      {job.url}
                    </a>
                  </td>

                  <td className="py-2.5 px-4">
                    <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-700 text-[10px] font-medium uppercase">
                      {job.isFullVideo ? 'Full Video' : 'Trim'}
                    </span>
                  </td>

                  <td className="py-2.5 px-4 text-neutral-700 font-medium">
                    {job.selectedQuality ? `${job.selectedQuality}p` : 'Auto'}
                  </td>

                  <td className="py-2.5 px-4">
                    <div className="space-y-0.5">
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-medium uppercase ${
                          job.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : job.status === 'processing'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : job.status === 'failed'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {job.status}
                      </span>
                      <p className="text-[11px] text-neutral-500 truncate max-w-xs">{job.step}</p>
                    </div>
                  </td>

                  <td className="py-2.5 px-4">
                    <div className="w-20 space-y-1">
                      <span className="text-[10px] text-neutral-500">{job.progress}%</span>
                      <div className="w-full h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          style={{ width: `${job.progress}%` }}
                          className={`h-full rounded-full ${
                            job.status === 'completed'
                              ? 'bg-emerald-600'
                              : job.status === 'failed'
                              ? 'bg-red-600'
                              : 'bg-neutral-900'
                          }`}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {job.error && (
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[11px] font-medium"
                        >
                          Error
                        </button>
                      )}

                      {(job.status === 'processing' || job.status === 'queued') && (
                        <button
                          onClick={() => handleCancelJob(job.id)}
                          className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-black text-white text-[11px] font-medium"
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
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    No active jobs in the queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-white border border-neutral-200 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900">
                Job Error Details
              </h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-neutral-600">
              <p>Job ID: <strong className="text-neutral-900 font-mono">{selectedJob.id}</strong></p>
              <p>URL: <span className="font-mono text-neutral-700 break-all">{selectedJob.url}</span></p>
            </div>

            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <pre className="text-xs text-neutral-800 font-mono whitespace-pre-wrap break-all max-h-56 overflow-y-auto">
                {selectedJob.error || 'No error details recorded.'}
              </pre>
            </div>

            <button
              onClick={() => setSelectedJob(null)}
              className="w-full py-2 rounded-lg bg-neutral-900 hover:bg-black text-white font-medium text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
