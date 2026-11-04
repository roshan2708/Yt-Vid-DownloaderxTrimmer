'use client';

import React, { useEffect, useState } from 'react';
import { getCurrentIdToken } from '@/src/lib/auth';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface DailyRecord {
  date: string;
  totalTrims: number;
  totalFullDownloads: number;
  qualityBreakdown: Record<string, number>;
  failuresCount: number;
  bytesProcessed: number;
  newUsersCount?: number;
  label?: string;
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
    userAnalytics?: {
      totalUsers: number;
      newUsersInPeriod: number;
      tierCounts: Record<string, number>;
    };
  };
  dailyRecords: DailyRecord[];
}

interface UserMetrics {
  totalUsers: number;
  newUsersInPeriod: number;
  activeUsersInPeriod: number;
  paidUsersCount: number;
  tierCounts: Record<string, number>;
  dailyRegistrations: Array<{
    date: string;
    count: number;
    label: string;
  }>;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function parseDateKey(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val.slice(0, 10);
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (val as { toDate: () => Date }).toDate().toISOString().slice(0, 10);
    } catch {
      return null;
    }
  }
  if (typeof (val as { _seconds?: number })._seconds === 'number') {
    return new Date((val as { _seconds: number })._seconds * 1000).toISOString().slice(0, 10);
  }
  if (typeof (val as { seconds?: number }).seconds === 'number') {
    return new Date((val as { seconds: number }).seconds * 1000).toISOString().slice(0, 10);
  }
  return null;
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color?: string;
  fill?: string;
  payload?: { date?: string; label?: string };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const fullDate = payload[0]?.payload?.date || label;
    return (
      <div className="bg-white border border-neutral-200 p-2.5 rounded-lg shadow-sm text-xs">
        <p className="font-semibold text-neutral-900 mb-1.5">{fullDate}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-neutral-600">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                <span>{entry.name}:</span>
              </span>
              <strong className="text-neutral-900 font-mono">{entry.value}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export default function AdminAnalyticsPage() {
  const [timeframe, setTimeframe] = useState<number>(14);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchAnalytics = async (days: number) => {
    try {
      setIsLoading(true);
      const token = await getCurrentIdToken();

      // Parallel fetch: Server analytics route + Cloud Firestore users
      const [serverRes, firestoreSnap] = await Promise.allSettled([
        token
          ? fetch(`/api/admin/analytics?days=${days}`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => (r.ok ? r.json() : null))
          : Promise.resolve(null),
        db ? getDocs(collection(db, 'users')) : Promise.resolve(null),
      ]);

      let analyticsJson: AnalyticsData | null = null;
      if (serverRes.status === 'fulfilled' && serverRes.value) {
        analyticsJson = serverRes.value;
        // Enrich dailyRecords with MM-DD label for XAxis
        if (analyticsJson?.dailyRecords) {
          analyticsJson.dailyRecords = analyticsJson.dailyRecords.map((d) => ({
            ...d,
            label: d.date.slice(5),
          }));
        }
        setData(analyticsJson);
      }

      // Compute User Analytics
      const dateList: string[] = [];
      const dateMap = new Map<string, number>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        const str = d.toISOString().slice(0, 10);
        dateList.push(str);
        dateMap.set(str, 0);
      }

      let totalUsers = 0;
      let newUsersInPeriod = 0;
      let activeUsersInPeriod = 0;
      let paidUsersCount = 0;
      const tierCounts: Record<string, number> = { free: 0, pro: 0, studio: 0, daypass: 0 };

      if (firestoreSnap.status === 'fulfilled' && firestoreSnap.value) {
        const docs = firestoreSnap.value.docs;
        totalUsers = docs.length;

        for (const doc of docs) {
          const u = doc.data();
          const tier = u.tier || 'free';
          tierCounts[tier] = (tierCounts[tier] || 0) + 1;
          if (tier === 'pro' || tier === 'studio' || tier === 'daypass') {
            paidUsersCount++;
          }

          const createdDate = parseDateKey(u.createdAt);
          if (createdDate && dateMap.has(createdDate)) {
            dateMap.set(createdDate, (dateMap.get(createdDate) || 0) + 1);
            newUsersInPeriod++;
          }

          const loginDate = parseDateKey(u.lastLoginAt);
          if (loginDate && loginDate >= dateList[0]) {
            activeUsersInPeriod++;
          }
        }
      } else if (analyticsJson?.summary?.userAnalytics) {
        totalUsers = analyticsJson.summary.userAnalytics.totalUsers;
        newUsersInPeriod = analyticsJson.summary.userAnalytics.newUsersInPeriod;
        Object.assign(tierCounts, analyticsJson.summary.userAnalytics.tierCounts);
      }

      const dailyRegistrations = dateList.map((d) => ({
        date: d,
        count: dateMap.get(d) || 0,
        label: d.slice(5), // "MM-DD"
      }));

      setUserMetrics({
        totalUsers,
        newUsersInPeriod,
        activeUsersInPeriod,
        paidUsersCount,
        tierCounts,
        dailyRegistrations,
      });
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeframe);
  }, [timeframe]);

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Platform & User Analytics</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time telemetry, user registrations, usage volume, and reliability metrics
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

      {/* SECTION 1: USER REGISTRATIONS & ACCOUNTS KPIS */}
      <div>
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2.5">
          User Growth & Registration KPIs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Registered Users */}
          <div className="p-4 rounded-xl bg-white border border-neutral-200">
            <div className="flex items-center justify-between text-neutral-500 text-xs">
              <span>Total Users</span>
              <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-neutral-900 mt-1.5">
              {isLoading ? '...' : (userMetrics?.totalUsers || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Cloud Firestore registered accounts</p>
          </div>

          {/* New Signups in Period */}
          <div className="p-4 rounded-xl bg-white border border-neutral-200">
            <div className="flex items-center justify-between text-neutral-500 text-xs">
              <span>New Signups</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                +{timeframe}d
              </span>
            </div>
            <p className="text-2xl font-bold text-neutral-900 mt-1.5">
              {isLoading ? '...' : (userMetrics?.newUsersInPeriod || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Registered in last {timeframe} days</p>
          </div>

          {/* Active Users */}
          <div className="p-4 rounded-xl bg-white border border-neutral-200">
            <div className="flex items-center justify-between text-neutral-500 text-xs">
              <span>Active in Period</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-neutral-900 mt-1.5">
              {isLoading ? '...' : (userMetrics?.activeUsersInPeriod || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Logged in within last {timeframe} days</p>
          </div>

          {/* Premium / Paid Users */}
          <div className="p-4 rounded-xl bg-white border border-neutral-200">
            <div className="flex items-center justify-between text-neutral-500 text-xs">
              <span>Paid Tiers</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Pro / Studio
              </span>
            </div>
            <p className="text-2xl font-bold text-neutral-900 mt-1.5">
              {isLoading ? '...' : (userMetrics?.paidUsersCount || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Creator Pro, Studio, or Daypass</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: DAILY REGISTRATIONS CHART (RECHARTS RESPONSIVE) */}
      <div className="p-5 rounded-xl bg-white border border-neutral-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <span>Daily User Registrations</span>
              <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[10px] normal-case font-medium">
                Last {timeframe} days
              </span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              New user accounts registered per day
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-neutral-900" />
            <span>New Accounts</span>
            <span className="text-neutral-400 font-mono text-[11px]">
              (Total: {userMetrics?.newUsersInPeriod || 0})
            </span>
          </div>
        </div>

        {/* Recharts Responsive Container */}
        <div className="h-64 w-full pt-2">
          {isMounted && userMetrics?.dailyRegistrations ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={userMetrics.dailyRegistrations}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis
                  dataKey="label"
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey="count"
                  name="New Users"
                  fill="#171717"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-neutral-50 rounded-lg text-neutral-400 text-xs">
              Loading registration chart...
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: VIDEO PROCESSING & TRAFFIC KPIS */}
      <div>
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2.5">
          Video Processing & Traffic KPIs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-neutral-200">
            <p className="text-xs font-medium text-neutral-500">Video Clips Trimmed</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1.5">
              {isLoading ? '...' : data?.summary.totalTrims.toLocaleString()}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Trimmed video segments</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-neutral-200">
            <p className="text-xs font-medium text-neutral-500">Full Video Downloads</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1.5">
              {isLoading ? '...' : data?.summary.totalFullDownloads.toLocaleString()}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Complete videos downloaded</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-neutral-200">
            <p className="text-xs font-medium text-neutral-500">Data Processed</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1.5">
              {isLoading ? '...' : formatBytes(data?.summary.totalBytes || 0)}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Network & cache throughput</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-neutral-200">
            <p className="text-xs font-medium text-neutral-500">Processing Success Rate</p>
            <p className="text-2xl font-bold text-neutral-900 mt-1.5">
              {isLoading ? '...' : `${data?.summary.successRate}%`}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {data?.summary.totalFailures} failures recorded
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 4: DAILY VIDEO VOLUME BREAKDOWN (RECHARTS RESPONSIVE) */}
      <div className="p-5 rounded-xl bg-white border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              Daily Video Volume
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Clips trimmed vs. full video downloads
            </p>
          </div>
        </div>

        {/* Recharts Responsive Container for Video Volume */}
        <div className="h-64 w-full pt-2">
          {isMounted && data?.dailyRecords ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.dailyRecords}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis
                  dataKey="label"
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  dataKey="totalTrims"
                  name="Video Trims"
                  fill="#DC2626"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={35}
                />
                <Bar
                  dataKey="totalFullDownloads"
                  name="Full Downloads"
                  fill="#525252"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={35}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-neutral-50 rounded-lg text-neutral-400 text-xs">
              Loading video volume chart...
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5: SUBSCRIPTION TIERS & RESOLUTION DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Subscription Tier Distribution */}
        <div className="p-5 rounded-xl bg-white border border-neutral-200 space-y-3">
          <div>
            <h2 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              Subscription Tier Distribution
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">Registered accounts grouped by subscription plan</p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { id: 'free', name: 'Starter (Free)', allowance: '3 trims / day' },
              { id: 'daypass', name: '24-Hour Pass', allowance: '15 trims / day' },
              { id: 'pro', name: 'Creator Pro', allowance: '200 trims / month' },
              { id: 'studio', name: 'Studio Power', allowance: '500 trims / month' },
            ].map((tier) => {
              const count = userMetrics?.tierCounts?.[tier.id] || 0;
              const total = userMetrics?.totalUsers || 1;
              const pct = ((count / total) * 100).toFixed(1);

              return (
                <div key={tier.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-neutral-800">{tier.name}</span>
                      <span className="text-neutral-400 text-[11px] ml-1.5">({tier.allowance})</span>
                    </div>
                    <span className="text-neutral-600 font-mono text-[11px]">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${
                        tier.id === 'studio'
                          ? 'bg-neutral-900'
                          : tier.id === 'pro'
                          ? 'bg-blue-600'
                          : tier.id === 'daypass'
                          ? 'bg-amber-500'
                          : 'bg-neutral-400'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resolution Distribution */}
        <div className="p-5 rounded-xl bg-white border border-neutral-200 space-y-3">
          <div>
            <h2 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              Resolution Distribution
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">Most frequently requested output resolutions</p>
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
                      {quality}p {quality === '2160' ? '(4K UHD)' : quality === '1080' ? '(Full HD)' : ''}
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
      </div>
    </div>
  );
}
