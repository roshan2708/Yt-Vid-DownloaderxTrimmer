'use client';

import React, { useEffect, useState } from 'react';
import { getCurrentIdToken } from '@/src/lib/auth';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  createdAt: string;
  updatedAt?: string;
  ip?: string;
  userAgent?: string;
}

function formatDate(val: string | null | undefined): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return `Today at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function AdminContactsPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      const token = await getCurrentIdToken();

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const [serverRes, firestoreSnap] = await Promise.allSettled([
        token
          ? fetch(`/api/admin/contacts?${params.toString()}`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => (r.ok ? r.json() : null))
          : Promise.resolve(null),
        db ? getDocs(collection(db, 'contact_messages')) : Promise.resolve(null),
      ]);

      const messageMap = new Map<string, ContactMessage>();

      // 1. Ingest from server response
      if (serverRes.status === 'fulfilled' && serverRes.value?.messages) {
        for (const msg of serverRes.value.messages) {
          messageMap.set(msg.id, msg);
        }
      }

      // 2. Ingest from Cloud Firestore (primary client cloud sync)
      if (firestoreSnap.status === 'fulfilled' && firestoreSnap.value) {
        for (const docSnap of firestoreSnap.value.docs) {
          const d = docSnap.data();
          const existing = messageMap.get(docSnap.id);
          const createdAtStr =
            typeof d.createdAt === 'string'
              ? d.createdAt
              : d.createdAt?.toDate
              ? d.createdAt.toDate().toISOString()
              : d.createdAt?.seconds
              ? new Date(d.createdAt.seconds * 1000).toISOString()
              : new Date().toISOString();

          messageMap.set(docSnap.id, {
            id: docSnap.id,
            name: d.name || 'Anonymous',
            email: d.email || 'No email',
            topic: d.topic || 'General Inquiry',
            message: d.message || '',
            status: d.status || existing?.status || 'unread',
            createdAt: createdAtStr,
            updatedAt: d.updatedAt || existing?.updatedAt,
            ip: d.ip || existing?.ip,
            userAgent: d.userAgent || existing?.userAgent,
          });
        }
      }

      let list = Array.from(messageMap.values());

      // Filter by status
      if (statusFilter !== 'all') {
        list = list.filter((m) => m.status === statusFilter);
      }

      // Filter by search
      if (search) {
        const q = search.toLowerCase().trim();
        list = list.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q) ||
            m.topic.toLowerCase().includes(q) ||
            m.message.toLowerCase().includes(q)
        );
      }

      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setMessages(list);
    } catch (err) {
      console.error('Failed to query contact messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleStatusChange = async (id: string, newStatus: ContactMessage['status']) => {
    setIsUpdating(true);
    setActionSuccess(null);
    try {
      // 1. Update Cloud Firestore directly
      if (db) {
        try {
          await updateDoc(doc(db, 'contact_messages', id), {
            status: newStatus,
            updatedAt: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.warn('Firestore update warning:', dbErr);
        }
      }

      // 2. Notify server API
      const token = await getCurrentIdToken();
      if (token) {
        try {
          await fetch('/api/admin/contacts', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ id, status: newStatus }),
          });
        } catch {
          // ignore
        }
      }

      // Update local state
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
      );
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      setActionSuccess(`Status updated to ${newStatus}.`);
      setTimeout(() => setActionSuccess(null), 1500);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Could not update message status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this inquiry?')) return;
    setIsUpdating(true);
    try {
      if (db) {
        try {
          await deleteDoc(doc(db, 'contact_messages', id));
        } catch (dbErr) {
          console.warn('Firestore delete warning:', dbErr);
        }
      }

      const token = await getCurrentIdToken();
      if (token) {
        try {
          await fetch(`/api/admin/contacts?id=${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          // ignore
        }
      }

      setMessages((prev) => prev.filter((m) => m.id !== id));
      setSelectedMessage(null);
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Failed to delete message');
    } finally {
      setIsUpdating(false);
    }
  };

  // Metric counts
  const totalCount = messages.length;
  const unreadCount = messages.filter((m) => m.status === 'unread').length;
  const repliedCount = messages.filter((m) => m.status === 'replied').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Contact Inquiries</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            User inquiries, download bug reports, feedback, and copyright notices
          </p>
        </div>

        <button
          onClick={fetchContacts}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium border border-neutral-300 transition-colors self-start sm:self-auto flex items-center gap-1.5"
        >
          <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-neutral-200">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Total Inquiries</span>
            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-1.5">{isLoading ? '...' : totalCount}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">All submitted contact tickets</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Unread Messages</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-1.5">{isLoading ? '...' : unreadCount}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">Awaiting administrator review</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Replied / Handled</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-1.5">{isLoading ? '...' : repliedCount}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">Answered support inquiries</p>
        </div>
      </div>

      {/* Filters & Status Tabs */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by sender, email, topic, or message keyword..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-900 placeholder-neutral-400 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
          />
          <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-neutral-200 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'read', label: 'Read' },
            { id: 'replied', label: 'Replied' },
            { id: 'archived', label: 'Archived' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Table */}
      <div className="rounded-xl bg-white border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-medium">
                <th className="py-2.5 px-4">Sender</th>
                <th className="py-2.5 px-4">Topic</th>
                <th className="py-2.5 px-4">Message Preview</th>
                <th className="py-2.5 px-4">Received</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {messages.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setSelectedMessage(m)}
                  className={`hover:bg-neutral-50 cursor-pointer transition-colors ${
                    m.status === 'unread' ? 'bg-amber-50/30 font-medium' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-neutral-700 uppercase text-[11px] shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 truncate">{m.name}</p>
                        <a
                          href={`mailto:${m.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] text-neutral-400 hover:text-neutral-700 font-mono truncate max-w-xs block"
                        >
                          {m.email}
                        </a>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        m.topic.toLowerCase().includes('copyright') || m.topic.toLowerCase().includes('dmca')
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : m.topic.toLowerCase().includes('billing')
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : m.topic.toLowerCase().includes('support')
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                      }`}
                    >
                      {m.topic}
                    </span>
                  </td>

                  <td className="py-3 px-4 max-w-xs">
                    <p className="truncate text-neutral-600 text-xs">{m.message}</p>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap text-neutral-500 text-[11px]">
                    {formatDate(m.createdAt)}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        m.status === 'unread'
                          ? 'bg-amber-100 text-amber-800'
                          : m.status === 'replied'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.status === 'archived'
                          ? 'bg-neutral-100 text-neutral-600'
                          : 'bg-neutral-200 text-neutral-800'
                      }`}
                    >
                      {m.status === 'unread' && <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />}
                      <span className="capitalize">{m.status}</span>
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedMessage(m)}
                        className="px-2.5 py-1 rounded bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs font-medium"
                      >
                        View
                      </button>

                      <a
                        href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.topic)} - ClipDown Support`}
                        className="p-1 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900"
                        title="Reply via Email"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}

              {messages.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-400">
                    No contact inquiries found matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl bg-white border border-neutral-200 p-6 shadow-xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 border border-neutral-200 text-neutral-700 uppercase">
                  {selectedMessage.topic}
                </span>
                <h3 className="text-base font-bold text-neutral-900 mt-1">{selectedMessage.name}</h3>
                <p className="text-xs text-neutral-500 font-mono">{selectedMessage.email}</p>
              </div>

              <button
                onClick={() => setSelectedMessage(null)}
                className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {actionSuccess && (
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                {actionSuccess}
              </div>
            )}

            {/* Message Body */}
            <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 font-mono">
                Message Content
              </p>
              <p className="text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed">
                {selectedMessage.message}
              </p>
            </div>

            {/* Metadata Info */}
            <div className="flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-100 pt-3">
              <span>Submitted: {formatDate(selectedMessage.createdAt)}</span>
              {selectedMessage.ip && <span>IP: {selectedMessage.ip}</span>}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-xs text-neutral-500">Status:</span>
                <select
                  disabled={isUpdating}
                  value={selectedMessage.status}
                  onChange={(e) =>
                    handleStatusChange(
                      selectedMessage.id,
                      e.target.value as ContactMessage['status']
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-medium text-neutral-800"
                >
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  disabled={isUpdating}
                  onClick={() => handleDelete(selectedMessage.id)}
                  className="px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 text-xs font-medium transition-colors"
                >
                  Delete
                </button>

                <a
                  href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(
                    selectedMessage.topic
                  )} - ClipDown Support`}
                  onClick={() => handleStatusChange(selectedMessage.id, 'replied')}
                  className="px-4 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Reply via Email</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
