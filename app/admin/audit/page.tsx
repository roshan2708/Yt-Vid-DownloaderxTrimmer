'use client';

import React, { useEffect, useState } from 'react';
import { getCurrentIdToken } from '@/src/lib/auth';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

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

      const [serverRes, firestoreSnap] = await Promise.allSettled([
        token
          ? fetch('/api/admin/audit?limit=60', {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => (r.ok ? r.json() : null))
          : Promise.resolve(null),
        db
          ? getDocs(
              query(
                collection(db, 'audit_logs'),
                orderBy('timestamp', 'desc'),
                limit(60)
              )
            )
          : Promise.resolve(null),
      ]);

      const logMap = new Map<string, AuditLogItem>();

      if (serverRes.status === 'fulfilled' && serverRes.value?.logs) {
        for (const log of serverRes.value.logs) {
          logMap.set(log.id, log);
        }
      }

      if (firestoreSnap.status === 'fulfilled' && firestoreSnap.value) {
        for (const docSnap of firestoreSnap.value.docs) {
          const d = docSnap.data();
          const timestampStr =
            typeof d.timestamp === 'string'
              ? d.timestamp
              : d.timestamp?.toDate
              ? d.timestamp.toDate().toISOString()
              : d.timestamp?.seconds
              ? new Date(d.timestamp.seconds * 1000).toISOString()
              : new Date().toISOString();

          logMap.set(docSnap.id, {
            id: docSnap.id,
            action: d.action || 'UNKNOWN',
            targetUserId: d.targetUserId,
            targetEmail: d.targetEmail,
            adminUid: d.adminUid,
            adminEmail: d.adminEmail || 'System / CLI',
            details: d.details || {},
            timestamp: timestampStr,
          });
        }
      }

      const list = Array.from(logMap.values());
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(list);
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
