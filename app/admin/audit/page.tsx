'use client';

import React, { useEffect, useState } from 'react';
import { getCurrentIdToken } from '@/src/lib/auth';

interface AuditLogItem {
  id: string;
  action: string;
  targetUserId?: string;
  targetEmail?: string;
  adminUid?: string;
  adminEmail: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const token = await getCurrentIdToken();
      if (!token) return;

      const res = await fetch('/api/admin/audit?limit=60', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to query audit trail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Security Audit Trail</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Immutable log of administrative interventions, tier adjustments, and permission changes
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold border border-neutral-800 transition-colors self-start sm:self-auto"
        >
          Refresh Audit Trail
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 font-mono uppercase text-[10px] bg-neutral-950/40">
                <th className="py-3.5 px-4">Timestamp (UTC)</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Admin</th>
                <th className="py-3.5 px-4">Target User</th>
                <th className="py-3.5 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="py-3.5 px-4 text-neutral-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.action.includes('BAN')
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : log.action.includes('GRANT') || log.action.includes('TIER')
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : log.action.includes('CREDITS')
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-neutral-200">
                    {log.adminEmail}
                  </td>

                  <td className="py-3.5 px-4 text-neutral-300">
                    {log.targetEmail || log.targetUserId || 'System'}
                  </td>

                  <td className="py-3.5 px-4 max-w-xs truncate text-[11px] text-neutral-400 font-mono">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}

              {logs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-500 font-sans">
                    No administrative actions logged yet.
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

