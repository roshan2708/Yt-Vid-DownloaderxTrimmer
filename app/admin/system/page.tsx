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
        setSaveSuccess('Configuration saved successfully.');
        fetchSystemData();
        setTimeout(() => setSaveSuccess(null), 3000);
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-neutral-900 tracking-tight">System Settings & Resources</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure runtime maintenance mode, free quota limits, and inspect server binaries
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Runtime Config Form */}
      <div className="p-5 rounded-xl bg-white border border-neutral-200">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
          <div>
            <h2 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              Runtime Configuration
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">Changes apply immediately across the site</p>
          </div>
          {!isSuperAdmin && (
            <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[10px] font-mono text-neutral-600">
              Superadmin Required
            </span>
          )}
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          {/* Maintenance Mode Toggle */}
          <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between">
            <div>
              <label htmlFor="maintenanceToggle" className="text-xs font-medium text-neutral-900 flex items-center gap-2">
                Maintenance Mode
                {maintenanceMode && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                    Enabled
                  </span>
                )}
              </label>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Displays maintenance notice on video processing requests.
              </p>
            </div>
            <input
              id="maintenanceToggle"
              type="checkbox"
              disabled={!isSuperAdmin}
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="w-4 h-4 rounded accent-neutral-900 cursor-pointer"
            />
          </div>

          {/* Maintenance Message */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-700">Maintenance Notice Text</label>
            <input
              type="text"
              disabled={!isSuperAdmin}
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="e.g. Under scheduled maintenance. Please check back shortly."
              className="w-full px-3 py-2 rounded-lg bg-white border border-neutral-300 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50"
            />
          </div>

          {/* Daily Limit */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-700">Default Free Daily Trim Limit</label>
            <input
              type="number"
              min={1}
              max={20}
              disabled={!isSuperAdmin}
              value={defaultDailyLimit}
              onChange={(e) => setDefaultDailyLimit(parseInt(e.target.value, 10))}
              className="w-28 px-3 py-2 rounded-lg bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50"
            />
            <p className="text-[11px] text-neutral-400">Daily trim quota granted to Starter accounts.</p>
          </div>

          {isSuperAdmin && (
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-black text-white font-medium text-xs transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          )}
        </form>
      </div>

      {/* Storage & Environment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Storage */}
        <div className="p-5 rounded-xl bg-white border border-neutral-200 space-y-3">
          <h2 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">Storage Paths</h2>
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <div className="flex items-center justify-between">
                <span className="font-medium text-neutral-700">RAM Disk (/dev/shm)</span>
                <span className="font-mono font-bold text-neutral-900">
                  {data ? formatBytes(data.storage.ramSizeBytes) : '...'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5 truncate">{data?.storage.ramTempDir}</p>
            </div>

            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <div className="flex items-center justify-between">
                <span className="font-medium text-neutral-700">SSD Storage (server/temp)</span>
                <span className="font-mono font-bold text-neutral-900">
                  {data ? formatBytes(data.storage.diskSizeBytes) : '...'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5 truncate">{data?.storage.diskTempDir}</p>
            </div>
          </div>
        </div>

        {/* Engine Binaries */}
        <div className="p-5 rounded-xl bg-white border border-neutral-200 space-y-3">
          <h2 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">Engine Binaries</h2>
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between">
              <span className="font-medium text-neutral-700">yt-dlp Version</span>
              <span className="font-mono text-neutral-900 font-semibold">
                {data?.binaries.ytDlpVersion || 'Checking...'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between">
              <span className="font-medium text-neutral-700">Operating System</span>
              <span className="font-mono text-neutral-700">
                {data?.process.platform} ({data?.process.arch})
              </span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between">
              <span className="font-medium text-neutral-700">Node.js Version</span>
              <span className="font-mono text-neutral-700">
                {data?.process.nodeVersion}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
