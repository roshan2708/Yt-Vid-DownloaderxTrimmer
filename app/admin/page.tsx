'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentIdToken } from '@/src/lib/auth';
import { useAdminAuth } from '@/src/context/AdminAuthContext';

interface OverviewData {
  admin: {
    email: string;
    role: string;
  };
  kpi: {
    totalUsers: number;
    trimsToday: number;
    fullDownloadsToday: number;
    bytesProcessedToday: number;
    failuresToday: number;
    sevenDayTrims: number;
    sevenDayFull: number;
    sevenDayBytes: number;
  };
  system: {
    uptimeSeconds: number;
    memoryUsage: { rss: number; heapUsed: number; heapTotal: number };
    ramDiskSizeBytes: number;
    diskTempSizeBytes: number;
    nodeVersion: string;
    platform: string;
  };
  recentActivity: Array<{
    date: string;
    totalTrims: number;
    totalFullDownloads: number;
    bytesProcessed: number;
    failuresCount: number;
  }>;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AdminOverviewPage() {
  const { adminUser } = useAdminAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanMessage, setCleanMessage] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setIsLoading(true);
      const token = await getCurrentIdToken();
      if (!token) return;

      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleCleanCache = async () => {
    setIsCleaning(true);
    setCleanMessage(null);
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
        setCleanMessage('Temporary files and expired cache cleared successfully!');
        fetchOverview();
      }
    } catch {
      setCleanMessage('Failed to trigger cache cleanup.');
    } finally {
      setIsCleaning(false);
      setTimeout(() => setCleanMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-red-950/40 via-neutral-900 to-neutral-900 border border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-950 border border-red-800 text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">
            Administrator Console
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {adminUser?.displayName || adminUser?.email?.split('@')[0]}
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            System running smoothly with high-speed RAM disk caching enabled.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOverview}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700/80 transition-colors flex items-center gap-1.5"
          >
            <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>

          <button
            onClick={handleCleanCache}
            disabled={isCleaning}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>{isCleaning ? 'Purging Cache...' : 'Purge Disk Cache'}</span>
          </button>
        </div>
      </div>

      {cleanMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{cleanMessage}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Registered Users</span>
            <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-white tracking-tight">
              {isLoading ? '...' : data?.kpi.totalUsers.toLocaleString()}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">Cloud Firestore verified profiles</p>
          </div>
        </div>

        {/* Trims Today */}
        <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Clips Trimmed Today</span>
            <div className="p-2 rounded-xl bg-red-950/60 border border-red-800/40 text-red-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-white tracking-tight">
              {isLoading ? '...' : data?.kpi.trimsToday.toLocaleString()}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              7-Day total: <strong className="text-neutral-300">{data?.kpi.sevenDayTrims} trims</strong>
            </p>
          </div>
        </div>

        {/* Full Downloads */}
        <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Full Video Downloads</span>
            <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-800/40 text-purple-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-white tracking-tight">
              {isLoading ? '...' : data?.kpi.fullDownloadsToday.toLocaleString()}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              7-Day total: <strong className="text-neutral-300">{data?.kpi.sevenDayFull} downloads</strong>
            </p>
          </div>
        </div>

        {/* Bandwidth Processed */}
        <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Bandwidth Processed</span>
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-white tracking-tight">
              {isLoading ? '...' : formatBytes(data?.kpi.bytesProcessedToday || 0)}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              7-Day volume: <strong className="text-neutral-300">{formatBytes(data?.kpi.sevenDayBytes || 0)}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* System Health Overview Card */}
      <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Server Performance & Storage Telemetry
          </h2>
          <span className="text-xs text-neutral-500 font-mono">
            Uptime: <strong className="text-neutral-300">{data?.system.uptimeSeconds ? formatUptime(data.system.uptimeSeconds) : '...'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>RAM Disk (/dev/shm)</span>
              <span className="text-emerald-400 font-mono font-semibold">Lightning I/O</span>
            </div>
            <p className="text-xl font-bold text-white mt-1">
              {data?.system ? formatBytes(data.system.ramDiskSizeBytes) : '...'}
            </p>
            <p className="text-[10px] text-neutral-500 mt-0.5">Clips written directly to RAM memory</p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>SSD Temp Storage</span>
              <span className="text-purple-400 font-mono font-semibold">Standard Disk</span>
            </div>
            <p className="text-xl font-bold text-white mt-1">
              {data?.system ? formatBytes(data.system.diskTempSizeBytes) : '...'}
            </p>
            <p className="text-[10px] text-neutral-500 mt-0.5">Temporary storage for full video downloads</p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Node.js Memory Heap</span>
              <span className="text-neutral-400 font-mono">{data?.system?.nodeVersion}</span>
            </div>
            <p className="text-xl font-bold text-white mt-1">
              {data?.system ? formatBytes(data.system.memoryUsage.heapUsed) : '...'}
            </p>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              Total Heap: {data?.system ? formatBytes(data.system.memoryUsage.heapTotal) : '...'}
            </p>
          </div>
        </div>
      </div>

      {/* 7-Day Activity Table */}
      <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">7-Day Operational Activity</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Daily breakdown of clips trimmed, full downloads, and failures</p>
          </div>
          <Link
            href="/admin/analytics"
            className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
          >
            View Deep Analytics &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 font-mono uppercase text-[10px]">
                <th className="py-3 px-3">Date (UTC)</th>
                <th className="py-3 px-3">Clips Trimmed</th>
                <th className="py-3 px-3">Full Downloads</th>
                <th className="py-3 px-3">Data Processed</th>
                <th className="py-3 px-3">Failures</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono">
              {data?.recentActivity?.map((row) => (
                <tr key={row.date} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="py-3 px-3 font-semibold text-white">{row.date}</td>
                  <td className="py-3 px-3 text-red-400 font-semibold">{row.totalTrims.toLocaleString()}</td>
                  <td className="py-3 px-3 text-purple-400 font-semibold">{row.totalFullDownloads.toLocaleString()}</td>
                  <td className="py-3 px-3 text-neutral-300">{formatBytes(row.bytesProcessed)}</td>
                  <td className="py-3 px-3">
                    {row.failuresCount > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-red-950 border border-red-800/60 text-red-400 font-bold">
                        {row.failuresCount} failed
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">0 errors</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!data?.recentActivity || data.recentActivity.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    No activity recorded for this timeframe yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

