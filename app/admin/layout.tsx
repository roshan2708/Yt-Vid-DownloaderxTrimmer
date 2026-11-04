'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/src/context/AdminAuthContext';
import AdminGuard from '@/src/components/admin/AdminGuard';
import BrandLogo from '@/src/components/BrandLogo';

const NAV_ITEMS = [
  {
    name: 'Overview',
    href: '/admin',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    name: 'Inquiries',
    href: '/admin/contacts',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: 'Job Queue',
    href: '/admin/jobs',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    name: 'System Health',
    href: '/admin/system',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  },
  {
    name: 'Audit Trail',
    href: '/admin/audit',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { adminUser, signOut } = useAdminAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // If on login page, render clean children without layout chrome
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return <>{children}</>;
  }

  const pageTitle =
    pathname === '/admin'
      ? 'Overview'
      : pathname.replace('/admin/', '').replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col md:flex-row antialiased font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <BrandLogo size="sm" />
          <span className="font-bold text-sm tracking-tight text-neutral-900">ClipDown</span>
          <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[10px] font-semibold text-neutral-600 uppercase">
            Admin
          </span>
        </div>
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="p-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-900"
          aria-label="Toggle navigation"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileNavOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="md:hidden fixed inset-0 bg-neutral-900/30 z-40 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Navigation - Fixed & Sticky Full Height on Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 flex flex-col justify-between transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 shrink-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="px-5 py-4 border-b border-neutral-200">
            <Link href="/admin" className="flex items-center gap-2.5">
              <BrandLogo size="sm" />
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-neutral-900">ClipDown</span>
                <span className="px-1.5 py-0.2 rounded bg-neutral-100 border border-neutral-200 text-[10px] font-medium text-neutral-600 uppercase tracking-wider">
                  Admin
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="p-3">
            <p className="px-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 font-mono">
              Management
            </p>
            <nav className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-neutral-900 text-white font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-neutral-500'}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-neutral-200 space-y-2">
          {/* Public site link */}
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-xs text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Public Web App</span>
            </span>
            <span className="text-[10px] text-neutral-400">&rarr;</span>
          </Link>

          {/* User Profile & Sign Out */}
          <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {adminUser?.photoURL ? (
                <img
                  src={adminUser.photoURL}
                  alt={adminUser.displayName || 'Admin'}
                  className="w-7 h-7 rounded-full border border-neutral-200 object-cover shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-[11px] font-bold text-neutral-700 uppercase shrink-0">
                  {adminUser?.email?.charAt(0) || 'A'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-neutral-900 truncate">
                  {adminUser?.displayName || adminUser?.email?.split('@')[0]}
                </p>
                <span className="inline-block text-[10px] text-neutral-500 font-mono uppercase truncate">
                  {adminUser?.role}
                </span>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              title="Sign Out"
              className="p-1 rounded-md hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition-colors ml-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xs border-b border-neutral-200 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-400">Admin</span>
            <span className="text-neutral-300">/</span>
            <h2 className="font-semibold text-neutral-900">{pageTitle}</h2>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Operational</span>
            </div>

            <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[11px] font-mono text-neutral-600 uppercase">
              {adminUser?.role}
            </span>
          </div>
        </header>

        {/* Page Content with proper Max-Width Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminGuard>
        <AdminShell>{children}</AdminShell>
      </AdminGuard>
    </AdminAuthProvider>
  );
}
