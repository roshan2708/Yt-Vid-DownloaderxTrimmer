'use client';

import React, { useEffect, useState } from 'react';
import { getCurrentIdToken } from '@/src/lib/auth';

interface DailyRecord {
  date: string;
  totalTrims: number;
  totalFullDownloads: number;
  qualityBreakdown: Record<string, number>;
  failuresCount: number;
  bytesProcessed: number;
}

interface AnalyticsData {
  days: number;
  summary: {
    totalTrims: number;
    totalFullDownloads: number;
    totalBytes: number;
    totalFailures: number;
    totalJobs: number;
    successRate: number;
    qualityTotals: Record<string, number>;
  };
  dailyRecords: DailyRecord[];
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function AdminAnalyticsPage() {
  const [timeframe, setTimeframe] = useState<number>(14);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async (days: number) => {
    try {
      setIsLoading(true);
      const token = await getCurrentIdToken();
      if (!token) return;

      const res = await fetch(`/api/admin/analytics?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeframe);
  }, [timeframe]);

  // Max value for bar scaling
  const maxVolume = Math.max(
    1,
    ...(data?.dailyRecords.map((d) => d.totalTrims + d.totalFullDownloads) || [10])
  );

  return (
    <div className="space-y-8">
      {/* Header with Timeframe selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Usage & Conversion Telemetry</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Aggregated traffic, video quality mix, and execution success metrics
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-900 border border-neutral-800 self-start sm:self-auto">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => setTimeframe(days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                timeframe === days
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Last {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Total Video Trims</p>
          <p className="text-3xl font-extrabold text-white mt-3">
            {isLoading ? '...' : data?.summary.totalTrims.toLocaleString()}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Trimmed clip segments</p>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Full Video Downloads</p>
          <p className="text-3xl font-extrabold text-purple-400 mt-3">
            {isLoading ? '...' : data?.summary.totalFullDownloads.toLocaleString()}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Full source videos downloaded</p>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Total Data Processed</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-3">
            {isLoading ? '...' : formatBytes(data?.summary.totalBytes || 0)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">Through RAM disk & temp caches</p>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Execution Success Rate</p>
          <p className="text-3xl font-extrabold text-cyan-400 mt-3">
            {isLoading ? '...' : `${data?.summary.successRate}%`}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">
            {data?.summary.totalFailures} failures recorded
          </p>
        </div>
      </div>

      {/* Visual Volume Bar Chart (Interactive Responsive SVG) */}
      <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Daily Processing Volume</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Clips trimmed (red) vs Full downloads (purple)</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500" />
              <span className="text-neutral-300">Trims</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-500" />
              <span className="text-neutral-300">Full Downloads</span>
            </span>
          </div>
        </div>

        {/* Chart Bars */}
        <div className="h-64 flex items-end gap-2 pt-6 pb-2 border-b border-neutral-800 overflow-x-auto">
          {data?.dailyRecords.map((d) => {
            const trimsH = (d.totalTrims / maxVolume) * 100;
            const fullH = (d.totalFullDownloads / maxVolume) * 100;
            const dayLabel = d.date.slice(5); // "MM-DD"

            return (
              <div key={d.date} className="flex-1 min-w-[28px] h-full flex flex-col justify-end items-center group relative">
                {/* Tooltip on hover */}
                <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-neutral-800 border border-neutral-700 px-2 py-1 rounded text-[10px] text-white shadow-xl whitespace-nowrap pointer-events-none">
                  <span>{d.date}</span>
                  <span className="text-red-400 font-bold">{d.totalTrims} trims | {d.totalFullDownloads} full</span>
                </div>

                <div className="w-full max-w-[20px] flex flex-col justify-end items-center gap-0.5 h-full">
                  {fullH > 0 && (
                    <div
                      style={{ height: `${Math.max(4, fullH)}%` }}
                      className="w-full bg-purple-500/80 rounded-t transition-all group-hover:bg-purple-400"
                    />
                  )}
                  {trimsH > 0 && (
                    <div
                      style={{ height: `${Math.max(4, trimsH)}%` }}
                      className="w-full bg-red-500/90 rounded-t transition-all group-hover:bg-red-400"
                    />
                  )}
                  {fullH === 0 && trimsH === 0 && (
                    <div className="w-full h-1 bg-neutral-800 rounded" />
                  )}
                </div>

                <span className="text-[10px] text-neutral-500 mt-2 font-mono group-hover:text-white">
                  {dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quality Breakdown & Error Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Mix */}
        <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Resolution Distribution</h2>
          <p className="text-xs text-neutral-400 mb-6">Preferred output quality requested by users</p>

          <div className="space-y-4">
            {['2160', '1440', '1080', '720', '480', '360'].map((quality) => {
              const count = data?.summary.qualityTotals?.[quality] || 0;
              const totalJobs = (data?.summary.totalTrims || 0) + (data?.summary.totalFullDownloads || 0);
              const percentage = totalJobs > 0 ? ((count / totalJobs) * 100).toFixed(1) : '0';

              return (
                <div key={quality} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-neutral-300 font-semibold">{quality}p {quality === '2160' ? '(4K UHD)' : quality === '1080' ? '(Full HD)' : ''}</span>
                    <span className="text-neutral-400">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      style={{ width: `${percentage}%` }}
                      className={`h-full rounded-full ${
                        quality === '2160'
                          ? 'bg-purple-500'
                          : quality === '1080'
                          ? 'bg-blue-500'
                          : quality === '720'
                          ? 'bg-emerald-500'
                          : 'bg-neutral-600'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reliability & Failure Diagnostic */}
        <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Reliability & Success Ratio</h2>
            <p className="text-xs text-neutral-400 mb-6">Automated engine completion vs. YouTube bot-checks</p>

            <div className="flex items-center justify-center py-6">
              <div className="relative w-44 h-44 rounded-full border-8 border-neutral-800 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-white">
                  {data?.summary.successRate}%
                </span>
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider mt-1">Success</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 space-y-2">
            <div className="flex items-center justify-between">
              <span>Total Jobs Handled:</span>
              <strong className="text-white font-mono">{data?.summary.totalJobs}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Successful Completions:</span>
              <strong className="text-emerald-400 font-mono">
                {(data?.summary.totalTrims || 0) + (data?.summary.totalFullDownloads || 0)}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Failures / Blocked:</span>
              <strong className="text-red-400 font-mono">{data?.summary.totalFailures}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
