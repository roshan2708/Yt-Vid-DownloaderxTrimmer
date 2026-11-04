'use client';

import React, { useEffect, useState } from 'react';
import { getCurrentIdToken } from '@/src/lib/auth';
import { collection, getDocs, doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

interface UserRecord {
  userId: string;
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin' | 'superadmin';
  tier: 'free' | 'pro' | 'studio' | 'daypass';
  trimsToday: number;
  trimsThisMonth: number;
  dailyLimit: number;
  bonusCredits: number;
  totalTrimsAllTime: number;
  isBanned: boolean;
  banReason?: string;
  createdAt: string | null;
  lastLoginAt: string | null;
}

function normalizeDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (val as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (typeof (val as { _seconds?: number })._seconds === 'number') {
    return new Date((val as { _seconds: number })._seconds * 1000).toISOString();
  }
  if (typeof (val as { seconds?: number }).seconds === 'number') {
    return new Date((val as { seconds: number }).seconds * 1000).toISOString();
  }
  return null;
}

function formatDate(val: string | null | undefined): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function getTierLimit(tier?: string, customLimit?: number): number {
  if (typeof customLimit === 'number' && customLimit > 0) return customLimit;
  switch (tier) {
    case 'studio':
      return 500;
    case 'pro':
      return 200;
    case 'daypass':
      return 15;
    default:
      return 3;
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Modal actions state
  const [newTier, setNewTier] = useState<string>('free');
  const [bonusInput, setBonusInput] = useState<number>(5);
  const [banReason, setBanReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const token = await getCurrentIdToken();

      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (tierFilter !== 'all') params.set('tier', tierFilter);

      // Parallel fetch: Call Server API AND query Cloud Firestore directly
      const [serverRes, firestoreSnap] = await Promise.allSettled([
        token
          ? fetch(`/api/admin/users?${params.toString()}`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => (r.ok ? r.json() : null))
          : Promise.resolve(null),
        db ? getDocs(collection(db, 'users')) : Promise.resolve(null),
      ]);

      const userMap = new Map<string, UserRecord>();

      // 1. Ingest Cloud Firestore records (primary source of truth)
      if (firestoreSnap.status === 'fulfilled' && firestoreSnap.value) {
        for (const docSnap of firestoreSnap.value.docs) {
          const d = docSnap.data();
          const email = (d.email || '').toLowerCase().trim();
          const isSuper = email === 'paisaan.dev@gmail.com';
          const role = isSuper ? 'superadmin' : (d.role as 'user' | 'admin' | 'superadmin') || 'user';
          const tier = (d.tier as 'free' | 'pro' | 'studio' | 'daypass') || 'free';

          const record: UserRecord = {
            userId: docSnap.id,
            uid: d.uid || docSnap.id,
            email: d.email || 'No email',
            displayName: d.displayName || null,
            photoURL: d.photoURL || null,
            role,
            tier,
            trimsToday: typeof d.trimsToday === 'number' ? d.trimsToday : 0,
            trimsThisMonth: typeof d.trimsThisMonth === 'number' ? d.trimsThisMonth : 0,
            dailyLimit: getTierLimit(tier, d.dailyLimit),
            bonusCredits: typeof d.bonusCredits === 'number' ? d.bonusCredits : 0,
            totalTrimsAllTime: typeof d.totalTrimsAllTime === 'number' ? d.totalTrimsAllTime : 0,
            isBanned: Boolean(d.isBanned),
            banReason: d.banReason || undefined,
            createdAt: normalizeDate(d.createdAt),
            lastLoginAt: normalizeDate(d.lastLoginAt),
          };
          userMap.set(record.userId, record);
        }
      }

      // 2. Ingest Server API records (merges quota counters and offline records)
      if (serverRes.status === 'fulfilled' && serverRes.value?.users) {
        for (const sUser of serverRes.value.users as UserRecord[]) {
          const existing = userMap.get(sUser.userId);
          if (!existing) {
            userMap.set(sUser.userId, sUser);
          } else {
            // Keep the highest trim count
            if (sUser.trimsToday > existing.trimsToday) existing.trimsToday = sUser.trimsToday;
            if (sUser.totalTrimsAllTime > existing.totalTrimsAllTime) {
              existing.totalTrimsAllTime = sUser.totalTrimsAllTime;
            }
          }
        }
      }

      let list = Array.from(userMap.values());

      // Apply client-side filters
      if (tierFilter !== 'all') {
        list = list.filter((u) => u.tier === tierFilter);
      }

      if (search) {
        const q = search.toLowerCase().trim();
        list = list.filter(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            (u.displayName && u.displayName.toLowerCase().includes(q)) ||
            u.userId.toLowerCase().includes(q)
        );
      }

      // Sort by newest joined first
      list.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setUsers(list);
    } catch (err) {
      console.error('Failed to query users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, tierFilter]);

  const handleUserAction = async (payload: Record<string, unknown>) => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    setActionSuccess(null);

    try {
      let isSuccess = false;

      // 1. Update Cloud Firestore directly
      if (db) {
        try {
          const userDocRef = doc(db, 'users', selectedUser.userId);
          const updates: Record<string, unknown> = {
            updatedAt: serverTimestamp(),
          };

          if (payload.action === 'UPDATE_TIER') {
            updates.tier = payload.tier;
            updates.dailyLimit = getTierLimit(payload.tier as string);
          } else if (payload.action === 'ADD_CREDITS') {
            updates.bonusCredits = increment(Number(payload.credits) || 0);
          } else if (payload.action === 'RESET_QUOTA') {
            updates.trimsToday = 0;
            updates.remainingToday = selectedUser.dailyLimit;
          } else if (payload.action === 'TOGGLE_BAN') {
            updates.isBanned = Boolean(payload.isBanned);
            if (payload.reason) updates.banReason = payload.reason;
          }

          await updateDoc(userDocRef, updates);
          isSuccess = true;
        } catch (dbErr) {
          console.warn('[Admin Users] Firestore direct update error:', dbErr);
        }
      }

      // 2. Also notify Server API to sync local quotas and audit logs
      const token = await getCurrentIdToken();
      if (token) {
        try {
          const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              ...payload,
              userId: selectedUser.userId,
            }),
          });
          if (res.ok) isSuccess = true;
        } catch {
          // ignore server notification error
        }
      }

      if (isSuccess) {
        setActionSuccess('User updated successfully.');
        await fetchUsers();
        setTimeout(() => {
          setSelectedUser(null);
          setActionSuccess(null);
        }, 1200);
      } else {
        alert('Could not update user document.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-neutral-900 tracking-tight">User Management</h1>
            <span className="px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-[11px] font-medium text-neutral-600">
              {users.length} {users.length === 1 ? 'user' : 'users'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Cloud Firestore real-time user accounts, subscription tiers, and quota moderation
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium border border-neutral-300 transition-colors self-start sm:self-auto flex items-center gap-1.5"
        >
          <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, name, or User ID..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-900 placeholder-neutral-400 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
          />
          <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="w-full sm:w-44 px-3 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-700 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
        >
          <option value="all">All Tiers</option>
          <option value="free">Starter (3/day)</option>
          <option value="pro">Creator Pro (200/mo)</option>
          <option value="studio">Studio Power (500/mo)</option>
          <option value="daypass">24-Hour Pass (15/day)</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-xl bg-white border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-medium">
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Tier</th>
                <th className="py-2.5 px-4">Quota Today</th>
                <th className="py-2.5 px-4">Bonus</th>
                <th className="py-2.5 px-4">Joined</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {users.map((u) => (
                <tr key={u.userId} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-7 h-7 rounded-full object-cover border border-neutral-200 shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-neutral-600 uppercase text-[11px] shrink-0">
                          {u.email.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900 truncate">{u.displayName || 'No Name'}</p>
                        <p className="text-[11px] text-neutral-400 font-mono truncate max-w-xs">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${
                        u.role === 'superadmin'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200 font-semibold'
                          : u.role === 'admin'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                          : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>

                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                        u.tier === 'studio'
                          ? 'bg-neutral-900 text-white'
                          : u.tier === 'pro'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : u.tier === 'daypass'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                      }`}
                    >
                      {u.tier}
                    </span>
                  </td>

                  <td className="py-2.5 px-4 whitespace-nowrap font-medium text-neutral-800">
                    {u.trimsToday} / {u.dailyLimit}
                  </td>

                  <td className="py-2.5 px-4 whitespace-nowrap text-neutral-600">
                    +{u.bonusCredits}
                  </td>

                  <td className="py-2.5 px-4 whitespace-nowrap text-neutral-500 text-[11px]">
                    {formatDate(u.createdAt)}
                  </td>

                  <td className="py-2.5 px-4 whitespace-nowrap">
                    {u.isBanned ? (
                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-medium">
                        Suspended
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                        Active
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setNewTier(u.tier);
                        setBanReason(u.banReason || '');
                      }}
                      className="px-2.5 py-1 rounded bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs font-medium transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}

              {users.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    No users found matching query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white border border-neutral-200 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Manage User Account</h3>
                <p className="text-xs text-neutral-500 truncate">{selectedUser.email}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {actionSuccess && (
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                {actionSuccess}
              </div>
            )}

            <div className="space-y-3">
              {/* 1. Change Subscription Tier */}
              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1.5">
                <label className="text-xs font-medium text-neutral-700">Change Subscription Tier</label>
                <div className="flex gap-2">
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded border border-neutral-300 bg-white text-xs text-neutral-800"
                  >
                    <option value="free">Starter (3/day)</option>
                    <option value="pro">Creator Pro (200/mo)</option>
                    <option value="studio">Studio Power (500/mo)</option>
                    <option value="daypass">24-Hour Pass (15/day)</option>
                  </select>
                  <button
                    disabled={isSubmitting || newTier === selectedUser.tier}
                    onClick={() => handleUserAction({ action: 'UPDATE_TIER', tier: newTier })}
                    className="px-3 py-1.5 rounded bg-neutral-900 hover:bg-black disabled:opacity-50 text-white text-xs font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* 2. Add Bonus Credits */}
              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1.5">
                <label className="text-xs font-medium text-neutral-700">Add Bonus Trims</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={bonusInput}
                    onChange={(e) => setBonusInput(parseInt(e.target.value, 10))}
                    className="w-24 px-2.5 py-1.5 rounded border border-neutral-300 bg-white text-xs text-neutral-800"
                  />
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleUserAction({ action: 'ADD_CREDITS', credits: bonusInput })}
                    className="px-3 py-1.5 rounded bg-neutral-900 hover:bg-black disabled:opacity-50 text-white text-xs font-medium transition-colors"
                  >
                    Grant +{bonusInput} Trims
                  </button>
                </div>
              </div>

              {/* 3. Reset Daily Quota */}
              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-neutral-700">Reset Today&apos;s Quota</p>
                  <p className="text-[11px] text-neutral-400">Resets trims used today to 0</p>
                </div>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleUserAction({ action: 'RESET_QUOTA' })}
                  className="px-2.5 py-1 rounded bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs font-medium"
                >
                  Reset
                </button>
              </div>

              {/* 4. Ban / Unban User */}
              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-neutral-700">Access Status</span>
                  <span className={selectedUser.isBanned ? 'text-red-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                    {selectedUser.isBanned ? 'Account Suspended' : 'Account Active'}
                  </span>
                </div>
                <button
                  disabled={isSubmitting}
                  onClick={() =>
                    handleUserAction({
                      action: 'TOGGLE_BAN',
                      isBanned: !selectedUser.isBanned,
                      reason: banReason,
                    })
                  }
                  className={`w-full py-1.5 rounded text-xs font-medium transition-colors ${
                    selectedUser.isBanned
                      ? 'bg-neutral-900 hover:bg-black text-white'
                      : 'bg-white hover:bg-red-50 text-red-700 border border-red-300'
                  }`}
                >
                  {selectedUser.isBanned ? 'Unban Account' : 'Suspend Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
