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

  const maxVolume = Math.max(
    1,
    ...(data?.dailyRecords.map((d) => d.totalTrims + d.totalFullDownloads) || [10])
  );

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Usage & Volume Analytics</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Aggregated traffic, video quality choices, and processing metrics
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-neutral-200 self-start sm:self-auto">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => setTimeframe(days)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                timeframe === days
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Last {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-neutral-200">
          <p className="text-xs font-medium text-neutral-500">Total Video Trims</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1.5">
            {isLoading ? '...' : data?.summary.totalTrims.toLocaleString()}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">Trimmed video clips</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200">
          <p className="text-xs font-medium text-neutral-500">Full Video Downloads</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1.5">
            {isLoading ? '...' : data?.summary.totalFullDownloads.toLocaleString()}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">Complete videos retrieved</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200">
          <p className="text-xs font-medium text-neutral-500">Data Processed</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1.5">
            {isLoading ? '...' : formatBytes(data?.summary.totalBytes || 0)}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">Total network & cache volume</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200">
          <p className="text-xs font-medium text-neutral-500">Success Rate</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1.5">
            {isLoading ? '...' : `${data?.summary.successRate}%`}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            {data?.summary.totalFailures} failures recorded
          </p>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="p-5 rounded-xl bg-white border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              Daily Volume Breakdown
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Clips trimmed (red) vs. full video downloads (gray)
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-600" />
              <span className="text-neutral-600">Trims</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-neutral-800" />
              <span className="text-neutral-600">Full</span>
            </span>
          </div>
        </div>

        {/* Clean Chart Bars */}
        <div className="h-56 flex items-end gap-1.5 pt-4 pb-2 border-b border-neutral-200 overflow-x-auto">
          {data?.dailyRecords.map((d) => {
            const trimsH = (d.totalTrims / maxVolume) * 100;
            const fullH = (d.totalFullDownloads / maxVolume) * 100;
            const dayLabel = d.date.slice(5); // "MM-DD"

            return (
              <div key={d.date} className="flex-1 min-w-[24px] h-full flex flex-col justify-end items-center group relative">
                {/* Tooltip on hover */}
                <div className="absolute -top-10 z-20 hidden group-hover:flex flex-col items-center bg-white border border-neutral-200 px-2 py-1 rounded text-[10px] text-neutral-800 shadow-md whitespace-nowrap pointer-events-none">
                  <span className="font-semibold">{d.date}</span>
                  <span className="text-neutral-600">{d.totalTrims} trims, {d.totalFullDownloads} full</span>
                </div>

                <div className="w-full max-w-[16px] flex flex-col justify-end items-center gap-0.5 h-full">
                  {fullH > 0 && (
                    <div
                      style={{ height: `${Math.max(4, fullH)}%` }}
                      className="w-full bg-neutral-800 rounded-t"
                    />
                  )}
                  {trimsH > 0 && (
                    <div
                      style={{ height: `${Math.max(4, trimsH)}%` }}
                      className="w-full bg-red-600 rounded-t"
                    />
                  )}
                  {fullH === 0 && trimsH === 0 && (
                    <div className="w-full h-1 bg-neutral-200 rounded" />
                  )}
                </div>

                <span className="text-[10px] text-neutral-400 mt-2 font-mono">
                  {dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Resolution Mix & Reliability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quality Mix */}
        <div className="p-5 rounded-xl bg-white border border-neutral-200 space-y-3">
          <div>
            <h2 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              Resolution Distribution
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">Most frequently selected output resolutions</p>
          </div>

          <div className="space-y-3 pt-2">
            {['2160', '1440', '1080', '720', '480', '360'].map((quality) => {
              const count = data?.summary.qualityTotals?.[quality] || 0;
              const totalJobs = (data?.summary.totalTrims || 0) + (data?.summary.totalFullDownloads || 0);
              const percentage = totalJobs > 0 ? ((count / totalJobs) * 100).toFixed(1) : '0';

              return (
                <div key={quality} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-700">
                      {quality}p {quality === '2160' ? '(4K)' : quality === '1080' ? '(HD)' : ''}
                    </span>
                    <span className="text-neutral-500 text-[11px]">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      style={{ width: `${percentage}%` }}
                      className={`h-full rounded-full ${
                        quality === '2160' || quality === '1080' ? 'bg-neutral-900' : 'bg-red-600'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reliability Overview */}
        <div className="p-5 rounded-xl bg-white border border-neutral-200 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              Pipeline Health
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">Job completion rate vs error occurrences</p>

            <div className="flex items-center justify-center py-6">
              <div className="w-28 h-28 rounded-full border-4 border-neutral-200 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-neutral-900">
                  {data?.summary.successRate}%
                </span>
                <span className="text-[10px] text-neutral-400 font-medium uppercase mt-0.5">Success</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Total Jobs Processed:</span>
              <strong className="text-neutral-900">{data?.summary.totalJobs}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Successful Completions:</span>
              <strong className="text-neutral-900">
                {(data?.summary.totalTrims || 0) + (data?.summary.totalFullDownloads || 0)}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Failed / Blocked by YouTube:</span>
              <strong className="text-red-700">{data?.summary.totalFailures}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
