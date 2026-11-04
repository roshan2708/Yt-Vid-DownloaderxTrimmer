'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/src/context/AdminAuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export default function AdminGuard({
  children,
  requireSuperAdmin = false,
}: AdminGuardProps) {
  const { firebaseUser, isLoading, isAdmin, isSuperAdmin, signOut } = useAdminAuth();
  const pathname = usePathname();

  // If on login page, render children directly without guarding
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return <>{children}</>;
  }

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mb-3" />
        <p className="text-neutral-700 text-sm font-medium">
          Verifying administrative permissions...
        </p>
      </div>
    );
  }

  // 2. Not Logged In
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center mb-4 text-neutral-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-neutral-900 mb-1.5">Sign In Required</h1>
        <p className="text-neutral-600 max-w-sm mb-5 text-xs sm:text-sm">
          Please sign in with your authorized administrator account to access this page.
        </p>
        <Link
          href={`/admin/login?next=${encodeURIComponent(pathname)}`}
          className="px-5 py-2.5 rounded-lg bg-neutral-900 hover:bg-black text-white font-medium text-xs sm:text-sm transition-colors"
        >
          Go to Admin Sign In
        </Link>
      </div>
    );
  }

  // 3. Logged In but Not an Admin (403 Forbidden)
  if (!isAdmin || (requireSuperAdmin && !isSuperAdmin)) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mb-4 text-red-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <span className="inline-block px-2.5 py-0.5 rounded bg-red-100 text-red-800 text-[11px] font-semibold uppercase tracking-wider mb-2">
          403 Access Denied
        </span>
        <h1 className="text-xl font-semibold text-neutral-900 mb-1.5">Administrative Privileges Required</h1>
        <p className="text-neutral-600 max-w-sm mb-2 text-xs sm:text-sm">
          Signed in as <strong className="text-neutral-900">{firebaseUser.email}</strong>. This account does not have admin permissions.
        </p>
        <p className="text-neutral-500 max-w-sm mb-5 text-xs">
          If you are the site owner, ensure your email matches the configured admin account or contact the system administrator.
        </p>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => signOut()}
            className="px-4 py-2 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-medium transition-colors"
          >
            Switch Account
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-medium transition-colors"
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
