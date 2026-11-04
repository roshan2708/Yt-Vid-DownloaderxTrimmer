'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/src/context/AdminAuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export default function AdminGuard({
  children,
  requireSuperAdmin = false,
}: AdminGuardProps) {
  const { adminUser, firebaseUser, isLoading, isAdmin, isSuperAdmin, signOut } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();

  // If on login page, render children directly without guarding
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return <>{children}</>;
  }

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mb-4" />
        <h2 className="text-white text-lg font-semibold tracking-wide">
          Verifying Administrative Access...
        </h2>
        <p className="text-neutral-400 text-sm mt-1">
          Validating cryptographic credentials & role permissions
        </p>
      </div>
    );
  }

  // 2. Not Logged In
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6 shadow-xl text-neutral-400">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Authentication Required</h1>
        <p className="text-neutral-400 max-w-md mb-6 text-sm">
          You must sign in with an authorized administrator account to access the ClipDown Management Console.
        </p>
        <Link
          href={`/admin/login?next=${encodeURIComponent(pathname)}`}
          className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition-colors shadow-lg shadow-red-600/20"
        >
          Go to Admin Sign In
        </Link>
      </div>
    );
  }

  // 3. Logged In but Not an Admin (403 Forbidden)
  if (!isAdmin || (requireSuperAdmin && !isSuperAdmin)) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-800/50 flex items-center justify-center mb-6 shadow-xl text-red-400">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/40 text-red-300 text-xs font-semibold uppercase tracking-wider mb-4">
          403 Access Denied
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Administrative Privileges Required</h1>
        <p className="text-neutral-400 max-w-md mb-2 text-sm">
          Signed in as <strong className="text-neutral-200">{firebaseUser.email}</strong>. This account has not been granted administrative privileges for ClipDown.
        </p>
        <p className="text-neutral-500 max-w-md mb-6 text-xs">
          If you believe this is an error, request the server administrator to run the bootstrap grant command:
          <code className="block mt-2 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-neutral-300 font-mono">
            node scripts/set-admin.js {firebaseUser.email}
          </code>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => signOut()}
            className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-sm font-medium border border-neutral-800 transition-colors"
          >
            Switch Account
          </button>
          <Link
            href="/"
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium transition-colors"
          >
            Return to App
          </Link>
        </div>
      </div>
    );
  }

  // 4. Authorized Admin
  return <>{children}</>;
}
