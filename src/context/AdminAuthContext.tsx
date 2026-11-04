'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import {
  getCurrentIdToken,
  onAuthStateChange,
  signInWithGoogle,
  signOutUser,
} from '@/src/lib/auth';

export type AdminRole = 'admin' | 'superadmin';

export interface AdminProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: AdminRole;
}

interface AdminAuthContextType {
  adminUser: AdminProfile | null;
  firebaseUser: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signIn: () => Promise<AdminProfile>;
  signOut: () => Promise<void>;
  refreshClaims: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

function setAdminCookie(hasAccess: boolean) {
  if (typeof document === 'undefined') return;
  if (hasAccess) {
    const isHttps = window.location.protocol === 'https:';
    document.cookie = `__admin_session=true; path=/; max-age=86400; SameSite=Lax${isHttps ? '; Secure' : ''}`;
  } else {
    document.cookie = '__admin_session=; path=/; max-age=0; SameSite=Lax';
  }
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkUserAdminStatus = async (user: User): Promise<AdminProfile | null> => {
    try {
      // 1. Force refresh Firebase Auth token to fetch latest custom claims
      const tokenResult = await user.getIdTokenResult(true);
      const claims = tokenResult.claims;

      let verifiedRole: AdminRole | null = null;
      if (claims.role === 'superadmin') {
        verifiedRole = 'superadmin';
      } else if (claims.admin === true || claims.role === 'admin') {
        verifiedRole = 'admin';
      }

      // 2. Fallback: Query Firestore users/{uid} in case claims were set in DB before token refresh
      if (!verifiedRole && db) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.role === 'superadmin') {
              verifiedRole = 'superadmin';
            } else if (data.role === 'admin' || data.isAdmin === true) {
              verifiedRole = 'admin';
            }
          }
        } catch (dbErr) {
          console.warn('[Admin Auth] Firestore role query warning:', dbErr);
        }
      }

      if (verifiedRole) {
        const profile: AdminProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: verifiedRole,
        };
        setAdminCookie(true);
        return profile;
      }

      setAdminCookie(false);
      return null;
    } catch (err) {
      console.error('[Admin Auth] Failed to check admin claims:', err);
      setAdminCookie(false);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setFirebaseUser(user);
      if (user) {
        const profile = await checkUserAdminStatus(user);
        setAdminUser(profile);
      } else {
        setAdminUser(null);
        setAdminCookie(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (): Promise<AdminProfile> => {
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      const profile = await checkUserAdminStatus(user);
      if (!profile) {
        throw new Error(
          'Access Denied: This Google account does not possess administrative privileges.'
        );
      }
      setAdminUser(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    try {
      setAdminCookie(false);
      await signOutUser();
      setAdminUser(null);
      setFirebaseUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshClaims = async (): Promise<void> => {
    if (auth.currentUser) {
      setIsLoading(true);
      try {
        const profile = await checkUserAdminStatus(auth.currentUser);
        setAdminUser(profile);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const isAdmin = adminUser !== null;
  const isSuperAdmin = adminUser?.role === 'superadmin';

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        firebaseUser,
        isLoading,
        isAdmin,
        isSuperAdmin,
        signIn,
        signOut,
        refreshClaims,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

