'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { User } from 'firebase/auth';
import {
  getCurrentIdToken,
  onAuthStateChange,
  signInWithGoogle,
  signOutUser,
} from '@/src/lib/auth';

interface UserQuota {
  tierName?: string;
  quotaCycle?: 'daily' | 'monthly';
  quotaLimit?: number;
  remainingQuota?: number;
  trimsToday?: number;
  dailyLimit?: number;
  remainingToday?: number;
  secondsUntilReset?: number;
}

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userQuota, setUserQuota] = useState<UserQuota | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);

      if (user) {
        try {
          const token = await getCurrentIdToken();
          if (token) {
            const res = await fetch('/api/quota', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              setUserQuota(data);
            }
          }
        } catch {
          // ignore
        }
      } else {
        setUserQuota(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      if (msg !== 'REDIRECTING') {
        alert(msg);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setCurrentUser(null);
      setUserQuota(null);
      setIsUserMenuOpen(false);
    } catch (err) {
      console.warn('Sign out failed:', err);
    }
  };

  const isDaily = userQuota?.quotaCycle !== 'monthly';
  const cycleLabel = isDaily ? 'daily' : 'monthly';
  const limitCount = userQuota?.quotaLimit ?? userQuota?.dailyLimit ?? 3;
  const remainingCount = userQuota?.remainingQuota ?? userQuota?.remainingToday ?? 3;

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm tracking-tighter group-hover:bg-neutral-800 transition-colors">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-neutral-900">
            ClipDown
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
          <Link
            href="/"
            className="hover:text-neutral-900 transition-colors py-1"
          >
            Downloader
          </Link>
          <Link
            href="/pricing"
            className="hover:text-neutral-900 transition-colors py-1 font-semibold text-neutral-800"
          >
            Pricing &amp; Plans
          </Link>
          <Link
            href="/policies"
            className="hover:text-neutral-900 transition-colors py-1"
          >
            Policies
          </Link>
          <Link
            href="/terms"
            className="hover:text-neutral-900 transition-colors py-1"
          >
            Terms &amp; Conditions
          </Link>
          <Link
            href="/privacy"
            className="hover:text-neutral-900 transition-colors py-1"
          >
            Privacy
          </Link>
          <Link
            href="/contact"
            className="hover:text-neutral-900 transition-colors py-1"
          >
            Contact Us
          </Link>
        </nav>

        {/* Desktop Action & Auth Area */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthLoading ? (
            <div className="w-8 h-8 rounded-full bg-neutral-100 animate-pulse"></div>
          ) : currentUser ? (
            <div className="flex items-center gap-3">
              {/* Quota Badge Pill */}
              {userQuota && (
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-[11px] font-medium text-neutral-700 transition-colors"
                  title="Click to view pricing and upgrade options"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      remainingCount > 0 ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  ></span>
                  <span>
                    {remainingCount}/{limitCount} {cycleLabel} trims
                  </span>
                </Link>
              )}

              {/* User Avatar & Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  aria-label="User menu"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Profile'}
                      className="w-8 h-8 rounded-full object-cover border border-neutral-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-neutral-900 text-white text-xs font-semibold flex items-center justify-center">
                      {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="text-xs font-medium text-neutral-800 max-w-[110px] truncate">
                    {currentUser.displayName || currentUser.email?.split('@')[0] || 'Account'}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Card */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 rounded-xl shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-neutral-100">
                      <p className="text-xs font-semibold text-neutral-900 truncate">
                        {currentUser.displayName || 'Signed In'}
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5">{currentUser.email}</p>
                      {userQuota && (
                        <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                          <span className="text-neutral-500">Plan:</span>
                          <span className="font-semibold text-neutral-900 uppercase">
                            {userQuota.tierName || 'Starter'}
                          </span>
                        </div>
                      )}
                    </div>

                    <Link
                      href="/pricing"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      View Pricing &amp; Top-Ups
                    </Link>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 text-neutral-800 hover:bg-neutral-50 transition-colors"
              >
                Pricing
              </Link>
              <button
                type="button"
                disabled={isSigningIn}
                onClick={handleSignIn}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isSigningIn ? 'Signing In...' : 'Sign In'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          {currentUser && (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-neutral-200 bg-neutral-50 text-[10px] font-medium text-neutral-700"
            >
              <span>{remainingCount} trims</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 focus:outline-none cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 pt-3 pb-5 space-y-2">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Downloader
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            Pricing &amp; Plans
          </Link>
          <Link
            href="/policies"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Policies Overview
          </Link>
          <Link
            href="/terms"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Terms &amp; Conditions
          </Link>
          <Link
            href="/privacy"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Privacy Policy
          </Link>
          <Link
            href="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Contact Us
          </Link>

          {/* Auth Action in Mobile Menu */}
          <div className="pt-3 border-t border-neutral-100">
            {currentUser ? (
              <div className="space-y-2">
                <div className="px-3 py-1.5 bg-neutral-50 rounded-lg text-xs">
                  <p className="font-semibold text-neutral-900">{currentUser.displayName || 'Signed In'}</p>
                  <p className="text-[11px] text-neutral-500">{currentUser.email}</p>
                  {userQuota && (
                    <p className="text-[11px] text-emerald-700 font-medium mt-1">
                      {remainingCount}/{limitCount} {cycleLabel} trims remaining
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full text-center px-4 py-2 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignIn();
                }}
                className="w-full text-center px-4 py-2.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
