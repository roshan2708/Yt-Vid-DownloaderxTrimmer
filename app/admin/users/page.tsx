'use client';

import React, { useEffect, useState } from 'react';
import { getCurrentIdToken } from '@/src/lib/auth';
import { useAdminAuth } from '@/src/context/AdminAuthContext';

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

export default function AdminUsersPage() {
  const { isSuperAdmin } = useAdminAuth();
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
      if (!token) return;

      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (tierFilter !== 'all') params.set('tier', tierFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
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
      const token = await getCurrentIdToken();
      if (!token) return;

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

      if (res.ok) {
        setActionSuccess('User updated successfully!');
        await fetchUsers();
        setTimeout(() => {
          setSelectedUser(null);
          setActionSuccess(null);
        }, 1200);
      } else {
        const err = await res.json();
        alert(err.error || 'Operation failed');
      }
    } catch {
      alert('Network request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Quota & Role Management</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Search, upgrade subscription tiers, add bonus credits, and moderate user access
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold border border-neutral-800 transition-colors self-start sm:self-auto"
        >
          Refresh Users
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, name, or User ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500 transition-colors"
          />
          <svg className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="w-full sm:w-44 px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-medium focus:outline-none focus:border-red-500"
          >
            <option value="all">All Tiers</option>
            <option value="free">Free Starter</option>
            <option value="pro">Creator Pro</option>
            <option value="studio">Studio Power</option>
            <option value="daypass">24-Hour Pass</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 font-mono uppercase text-[10px] bg-neutral-950/40">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Tier</th>
                <th className="py-3.5 px-4">Quota Today</th>
                <th className="py-3.5 px-4">Bonus Credits</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono">
              {users.map((u) => (
                <tr key={u.userId} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full object-cover border border-neutral-700" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-neutral-300 uppercase">
                          {u.email.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white font-sans">{u.displayName || 'No Name'}</p>
                        <p className="text-[11px] text-neutral-400">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'superadmin'
                          ? 'bg-purple-950 border border-purple-800 text-purple-300'
                          : u.role === 'admin'
                          ? 'bg-red-950 border border-red-800 text-red-300'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.tier === 'studio'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                          : u.tier === 'pro'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                          : u.tier === 'daypass'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {u.tier}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-neutral-300 font-semibold">
                    {u.trimsToday} / {u.dailyLimit}
                  </td>

                  <td className="py-3.5 px-4 text-emerald-400 font-semibold">
                    +{u.bonusCredits}
                  </td>

                  <td className="py-3.5 px-4">
                    {u.isBanned ? (
                      <span className="px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-400 text-[10px] font-bold">
                        Banned
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-[10px] font-bold">
                        Active
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setNewTier(u.tier);
                        setBanReason(u.banReason || '');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-sans text-xs font-medium transition-colors"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}

              {users.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500 font-sans">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Management Drawer Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Manage User</h3>
                <p className="text-xs text-neutral-400">{selectedUser.email}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-medium">
                {actionSuccess}
              </div>
            )}

            {/* Actions Grid */}
            <div className="space-y-4">
              {/* 1. Change Subscription Tier */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <label className="text-xs font-semibold text-neutral-300">Change Subscription Tier</label>
                <div className="flex gap-2">
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white"
                  >
                    <option value="free">Starter (Free - 3/day)</option>
                    <option value="pro">Creator Pro (200/mo)</option>
                    <option value="studio">Studio Power (500/mo)</option>
                    <option value="daypass">24-Hour Pass (15/day)</option>
                  </select>
                  <button
                    disabled={isSubmitting || newTier === selectedUser.tier}
                    onClick={() => handleUserAction({ action: 'UPDATE_TIER', tier: newTier })}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                  >
                    Save Tier
                  </button>
                </div>
              </div>

              {/* 2. Add Bonus Credits */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <label className="text-xs font-semibold text-neutral-300">Grant Bonus Credits (Customer Support)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={bonusInput}
                    onChange={(e) => setBonusInput(parseInt(e.target.value, 10))}
                    className="w-28 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white"
                  />
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleUserAction({ action: 'ADD_CREDITS', credits: bonusInput })}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                  >
                    Grant +{bonusInput} Credits
                  </button>
                </div>
              </div>

              {/* 3. Reset Daily Quota */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-300">Reset Today&apos;s Quota</p>
                  <p className="text-[11px] text-neutral-500">Resets trims used today to 0</p>
                </div>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleUserAction({ action: 'RESET_QUOTA' })}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium"
                >
                  Reset to 0
                </button>
              </div>

              {/* 4. Ban / Unban User */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300">Account Access Control</span>
                  <span className="text-[11px] text-neutral-400">
                    Status: <strong className={selectedUser.isBanned ? 'text-red-400' : 'text-emerald-400'}>
                      {selectedUser.isBanned ? 'Suspended' : 'Authorized'}
                    </strong>
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
                  className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${
                    selectedUser.isBanned
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300'
                  }`}
                >
                  {selectedUser.isBanned ? 'Lift Account Suspension (Unban)' : 'Suspend Account (Ban from ClipDown)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
