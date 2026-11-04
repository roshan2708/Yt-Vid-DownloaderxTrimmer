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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Security Audit Log</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Record of administrative tier adjustments, quota modifications, and role updates
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium border border-neutral-300 transition-colors self-start sm:self-auto"
        >
          Refresh Log
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl bg-white border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-medium">
                <th className="py-2.5 px-4">Timestamp (UTC)</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Admin Email</th>
                <th className="py-2.5 px-4">Target User</th>
                <th className="py-2.5 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-2.5 px-4 text-neutral-500 whitespace-nowrap font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>

                  <td className="py-2.5 px-4">
                    <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-700 font-mono text-[10px] uppercase">
                      {log.action}
                    </span>
                  </td>

                  <td className="py-2.5 px-4 text-neutral-700">
                    {log.adminEmail}
                  </td>

                  <td className="py-2.5 px-4 text-neutral-900 font-medium truncate max-w-xs">
                    {log.targetEmail || log.targetUserId || 'System'}
                  </td>

                  <td className="py-2.5 px-4 max-w-xs truncate text-[11px] text-neutral-500 font-mono">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}

              {logs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-400">
                    No administrative actions recorded yet.
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
