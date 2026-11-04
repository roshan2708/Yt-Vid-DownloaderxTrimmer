'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/src/context/AdminAuthContext';
import BrandLogo from '@/src/components/BrandLogo';

function AdminLoginContent() {
  const { firebaseUser, isLoading, isAdmin, signIn, signOut } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/admin';

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAdmin) {
      router.replace(nextUrl);
    }
  }, [isLoading, isAdmin, router, nextUrl]);

  const handleSignIn = async () => {
    setErrorMessage(null);
    setIsSigningIn(true);
    try {
      await signIn();
      router.replace(nextUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Admin sign-in failed.';
      if (msg !== 'REDIRECTING') {
        setErrorMessage(msg);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-3">
            <BrandLogo size="md" />
            <span className="text-lg font-bold tracking-tight text-neutral-900">Cut Tadaao</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 text-[11px] font-medium mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
            Admin Console
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Sign in to Admin Panel</h1>
          <p className="text-neutral-500 text-xs mt-1">
            Sign in with your authorized administrator account
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold">Access Denied</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {firebaseUser && !isAdmin && !isLoading ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-center">
                <p className="text-xs text-neutral-500">Currently signed in as:</p>
                <p className="text-xs font-semibold text-neutral-900 mt-0.5 truncate">{firebaseUser.email}</p>
                <p className="text-[11px] text-amber-700 mt-1.5 font-medium">This account does not have admin access.</p>
              </div>

              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-neutral-900 hover:bg-black text-white font-medium text-xs transition-colors disabled:opacity-50"
              >
                {isSigningIn ? 'Connecting...' : 'Sign in with Different Account'}
              </button>

              <button
                onClick={() => signOut()}
                className="w-full py-2 px-4 rounded-lg bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600 font-medium text-xs transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleSignIn}
                disabled={isSigningIn || isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg bg-neutral-900 hover:bg-black text-white font-medium text-xs sm:text-sm transition-colors disabled:opacity-60"
              >
                {isSigningIn ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  </>
                )}
              </button>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <Link href="/" className="hover:text-neutral-800 transition-colors">
              &larr; Back to Cut Tadaao
            </Link>
            <span className="text-[11px] text-neutral-400">Admin Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
