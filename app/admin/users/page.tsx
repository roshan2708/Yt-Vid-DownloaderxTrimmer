'use client';

import React, { useEffect, useState } from 'react';
import { getCurrentIdToken } from '@/src/lib/auth';

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
        setActionSuccess('User updated successfully.');
        await fetchUsers();
        setTimeout(() => {
          setSelectedUser(null);
          setActionSuccess(null);
        }, 1000);
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">User Quota Management</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Search registered users, upgrade subscription tiers, and moderate quotas
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium border border-neutral-300 transition-colors self-start sm:self-auto"
        >
          Refresh Users
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
          className="w-full sm:w-40 px-3 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-700 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
        >
          <option value="all">All Tiers</option>
          <option value="free">Free Starter</option>
          <option value="pro">Creator Pro</option>
          <option value="studio">Studio Power</option>
          <option value="daypass">24-Hour Pass</option>
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
                <th className="py-2.5 px-4">Bonus Credits</th>
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
                        <img src={u.photoURL} alt="" className="w-7 h-7 rounded-full object-cover border border-neutral-200" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-neutral-600 uppercase text-[11px]">
                          {u.email.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-neutral-900">{u.displayName || 'No Name'}</p>
                        <p className="text-[11px] text-neutral-400 font-mono truncate max-w-xs">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 px-4">
                    <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-700 text-[10px] font-mono uppercase">
                      {u.role}
                    </span>
                  </td>

                  <td className="py-2.5 px-4">
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

                  <td className="py-2.5 px-4 font-medium text-neutral-800">
                    {u.trimsToday} / {u.dailyLimit}
                  </td>

                  <td className="py-2.5 px-4 text-neutral-600">
                    +{u.bonusCredits}
                  </td>

                  <td className="py-2.5 px-4">
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

                  <td className="py-2.5 px-4 text-right">
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
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
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
