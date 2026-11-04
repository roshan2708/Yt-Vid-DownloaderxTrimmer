'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentIdToken } from '@/src/lib/auth';
import { useAdminAuth } from '@/src/context/AdminAuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

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

      const [res, firestoreSnap] = await Promise.allSettled([
        token
          ? fetch('/api/admin/overview', {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => (r.ok ? r.json() : null))
          : Promise.resolve(null),
        db ? getDocs(collection(db, 'users')) : Promise.resolve(null),
      ]);

      let overviewJson: OverviewData | null = null;
      if (res.status === 'fulfilled' && res.value) {
        overviewJson = res.value;
      }

      let liveUserCount: number | null = null;
      if (firestoreSnap.status === 'fulfilled' && firestoreSnap.value) {
        liveUserCount = firestoreSnap.value.size;
      }

      if (overviewJson) {
        if (typeof liveUserCount === 'number') {
          overviewJson.kpi.totalUsers = liveUserCount;
        }
        setData(overviewJson);
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
        setCleanMessage('Temporary cache files cleared.');
        fetchOverview();
      }
    } catch {
      setCleanMessage('Failed to trigger cache cleanup.');
    } finally {
      setIsCleaning(false);
      setTimeout(() => setCleanMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-xl bg-white border border-neutral-200">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Logged in as {adminUser?.email} ({adminUser?.role})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOverview}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-medium border border-neutral-200 transition-colors flex items-center gap-1.5"
          >
            <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>

          <button
            onClick={handleCleanCache}
            disabled={isCleaning}
            className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {isCleaning ? 'Clearing...' : 'Clear Temp Cache'}
          </button>
        </div>
      </div>

      {cleanMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{cleanMessage}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Total Users</span>
            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2">
            {isLoading ? '...' : data?.kpi.totalUsers.toLocaleString()}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">Firestore user accounts</p>
        </div>

        {/* Trims Today */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Trims Today</span>
            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2">
            {isLoading ? '...' : data?.kpi.trimsToday.toLocaleString()}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            7-day total: {data?.kpi.sevenDayTrims || 0}
          </p>
        </div>

        {/* Full Downloads */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Full Downloads</span>
            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2">
            {isLoading ? '...' : data?.kpi.fullDownloadsToday.toLocaleString()}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            7-day total: {data?.kpi.sevenDayFull || 0}
          </p>
        </div>

        {/* Bandwidth Processed */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Data Today</span>
            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2">
            {isLoading ? '...' : formatBytes(data?.kpi.bytesProcessedToday || 0)}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            7-day total: {formatBytes(data?.kpi.sevenDayBytes || 0)}
          </p>
        </div>
      </div>

      {/* System Telemetry Row */}
      <div className="p-5 rounded-xl bg-white border border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
            Server Resources & Cache Storage
          </h2>
          <span className="text-xs text-neutral-500">
            Uptime: {data?.system.uptimeSeconds ? formatUptime(data.system.uptimeSeconds) : '...'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
            <span className="text-xs text-neutral-500">RAM Disk Cache (/dev/shm)</span>
            <p className="text-base font-bold text-neutral-900 mt-1">
              {data?.system ? formatBytes(data.system.ramDiskSizeBytes) : '...'}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
            <span className="text-xs text-neutral-500">SSD Storage (server/temp)</span>
            <p className="text-base font-bold text-neutral-900 mt-1">
              {data?.system ? formatBytes(data.system.diskTempSizeBytes) : '...'}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
            <span className="text-xs text-neutral-500">Node.js Memory (Heap Used)</span>
            <p className="text-base font-bold text-neutral-900 mt-1">
              {data?.system ? formatBytes(data.system.memoryUsage.heapUsed) : '...'}
            </p>
          </div>
        </div>
      </div>

      {/* 7-Day Activity Table */}
      <div className="rounded-xl bg-white border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">7-Day Activity Summary</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Daily breakdown of trims and downloads</p>
          </div>
          <Link
            href="/admin/analytics"
            className="text-xs font-medium text-neutral-900 hover:text-black underline"
          >
            Detailed Analytics &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-medium">
                <th className="py-2.5 px-4">Date (UTC)</th>
                <th className="py-2.5 px-4">Clips Trimmed</th>
                <th className="py-2.5 px-4">Full Downloads</th>
                <th className="py-2.5 px-4">Data Processed</th>
                <th className="py-2.5 px-4">Failures</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {data?.recentActivity?.map((row) => (
                <tr key={row.date} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-2.5 px-4 font-medium">{row.date}</td>
                  <td className="py-2.5 px-4">{row.totalTrims.toLocaleString()}</td>
                  <td className="py-2.5 px-4">{row.totalFullDownloads.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-neutral-600">{formatBytes(row.bytesProcessed)}</td>
                  <td className="py-2.5 px-4">
                    {row.failuresCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[11px] font-medium">
                        {row.failuresCount} failed
                      </span>
                    ) : (
                      <span className="text-neutral-400">0</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!data?.recentActivity || data.recentActivity.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-neutral-400">
                    No activity recorded yet.
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
