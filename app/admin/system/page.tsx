'use client';

import React, { useEffect, useState } from 'react';
import { getCurrentIdToken } from '@/src/lib/auth';
import { useAdminAuth } from '@/src/context/AdminAuthContext';

interface SystemData {
  config: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    defaultDailyFreeLimit: number;
  };
  storage: {
    ramTempDir: string;
    ramSizeBytes: number;
    diskTempDir: string;
    diskSizeBytes: number;
    totalTempBytes: number;
  };
  binaries: {
    ytDlpVersion: string;
  };
  process: {
    uptimeSeconds: number;
    memoryUsage: { rss: number; heapUsed: number; heapTotal: number };
    nodeVersion: string;
    platform: string;
    arch: string;
  };
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function AdminSystemPage() {
  const { isSuperAdmin } = useAdminAuth();
  const [data, setData] = useState<SystemData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [defaultDailyLimit, setDefaultDailyLimit] = useState(3);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const fetchSystemData = async () => {
    try {
      setIsLoading(true);
      const token = await getCurrentIdToken();
      if (!token) return;

      const res = await fetch('/api/admin/system', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setMaintenanceMode(Boolean(json.config?.maintenanceMode));
        setMaintenanceMessage(json.config?.maintenanceMessage || '');
        setDefaultDailyLimit(json.config?.defaultDailyFreeLimit || 3);
      }
    } catch (err) {
      console.error('Failed to query system status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert('Only Superadmins can update system settings.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(null);
    try {
      const token = await getCurrentIdToken();
      if (!token) return;

      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          maintenanceMode,
          maintenanceMessage,
          defaultDailyFreeLimit: defaultDailyLimit,
        }),
      });

      if (res.ok) {
        setSaveSuccess('System configuration saved successfully!');
        fetchSystemData();
        setTimeout(() => setSaveSuccess(null), 3500);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save configuration');
      }
    } catch {
      alert('Network request failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Infrastructure & Runtime Toggles</h1>
        <p className="text-neutral-400 text-xs sm:text-sm mt-1">
          Configure runtime maintenance banners, adjust free tier limits, and inspect worker binaries
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Runtime Config Form */}
      <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Dynamic Runtime Configuration</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Applied immediately across frontend & backend without redeploy</p>
          </div>
          {!isSuperAdmin && (
            <span className="px-2.5 py-1 rounded bg-neutral-800 text-[10px] font-mono text-neutral-400">
              Superadmin Required
            </span>
          )}
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-5">
          {/* Maintenance Mode Toggle */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="maintenanceToggle" className="text-xs font-semibold text-white flex items-center gap-2">
                Emergency Maintenance Mode
                {maintenanceMode && (
                  <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-400 text-[10px] font-bold">
                    Active
                  </span>
                )}
              </label>
              <p className="text-[11px] text-neutral-400">
                When active, public video processing requests will display a maintenance notice.
              </p>
            </div>
            <input
              id="maintenanceToggle"
              type="checkbox"
              disabled={!isSuperAdmin}
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="w-5 h-5 rounded accent-red-600 cursor-pointer"
            />
          </div>

          {/* Maintenance Message */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">Custom Maintenance Notice</label>
            <input
              type="text"
              disabled={!isSuperAdmin}
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="e.g. We are performing server upgrades. We will be back shortly!"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 disabled:opacity-50"
            />
          </div>

          {/* Daily Limit */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">Default Free Daily Trim Limit</label>
            <input
              type="number"
              min={1}
              max={20}
              disabled={!isSuperAdmin}
              value={defaultDailyLimit}
              onChange={(e) => setDefaultDailyLimit(parseInt(e.target.value, 10))}
              className="w-32 px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
            />
            <p className="text-[11px] text-neutral-500">Number of free trims granted to Starter tier users daily.</p>
          </div>

          {isSuperAdmin && (
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50"
            >
              {isSaving ? 'Saving Updates...' : 'Save Configuration'}
            </button>
          )}
        </form>
      </div>

      {/* Storage & Memory Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Storage Breakdown */}
        <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Storage Architecture</h2>
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">RAM Disk (/dev/shm)</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {data ? formatBytes(data.storage.ramSizeBytes) : '...'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 font-mono truncate">{data?.storage.ramTempDir}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">SSD Temp Storage</span>
                <span className="text-purple-400 font-mono font-bold">
                  {data ? formatBytes(data.storage.diskSizeBytes) : '...'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 font-mono truncate">{data?.storage.diskTempDir}</p>
            </div>
          </div>
        </div>

        {/* Engine Binaries */}
        <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Engine Binaries & Environment</h2>
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <span className="font-semibold text-white">yt-dlp Engine Version</span>
              <span className="text-cyan-400 font-mono font-bold">
                {data?.binaries.ytDlpVersion || 'Checking...'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <span className="font-semibold text-white">Runtime OS & Architecture</span>
              <span className="text-neutral-300 font-mono font-semibold">
                {data?.process.platform} ({data?.process.arch})
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <span className="font-semibold text-white">Node.js Version</span>
              <span className="text-neutral-300 font-mono font-semibold">
                {data?.process.nodeVersion}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

