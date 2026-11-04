import {
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

// Track synced UIDs in current browser session to prevent duplicate calls
const syncedUids = new Set<string>();

/**
 * Synchronizes user authentication profile and initial quota state to Cloud Firestore
 */
export async function syncUserToFirestore(user: User): Promise<void> {
  if (!user || !user.uid) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    const now = serverTimestamp();

    if (!snap.exists()) {
      // First-time sign in: initialize user document with Starter (free) quota values
      await setDoc(userRef, {
        userId: user.uid,
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        providerId: user.providerData?.[0]?.providerId || 'google.com',
        tier: 'free',
        trimsToday: 0,
        dailyLimit: 3,
        remainingToday: 3,
        bonusCredits: 0,
        totalTrimsAllTime: 0,
        createdAt: now,
        lastLoginAt: now,
        updatedAt: now,
      });
      console.log(`[Firestore] Created new profile for user: ${user.uid} (${user.email || 'no-email'})`);
    } else {
      // Returning user: update latest login timestamp and profile details
      await setDoc(
        userRef,
        {
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          lastLoginAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
      console.log(`[Firestore] Updated login info for user: ${user.uid}`);
    }
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    console.warn('[Firestore] Could not write user to Firestore:', error?.message || error);
    if (error?.code === 'permission-denied') {
      console.warn(
        '[Firestore] Permission denied! In Firebase Console, ensure Firestore rules allow authenticated users:\n' +
        'match /users/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }'
      );
    }
  }
}

// Check if client is a mobile device
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Ensure browser-local persistence is set once on client
let persistenceInitialized = false;
export async function initPersistence(): Promise<void> {
  if (typeof window === 'undefined' || persistenceInitialized) return;
  try {
    await setPersistence(auth, browserLocalPersistence);
    persistenceInitialized = true;
  } catch (err) {
    console.warn('Failed to set browser local persistence:', err);
  }
}

/**
 * Signs in with Google using popup, with graceful redirect fallback for mobile or blocked popups
 */
export async function signInWithGoogle(): Promise<User> {
  await initPersistence();

  // If on mobile, use redirect to avoid popup blockers and browser tab closing issues
  if (isMobileDevice()) {
    await signInWithRedirect(auth, googleProvider);
    // Redirect will navigate away; throw error to avoid hanging caller
    throw new Error('REDIRECTING');
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    syncedUids.add(result.user.uid);
    await syncUserToFirestore(result.user);
    return result.user;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };

    // If popup was blocked or not allowed, fallback to redirect
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/cancelled-popup-request' ||
      error.code === 'auth/popup-closed-by-user'
    ) {
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in popup was closed. Please try again.');
      }

      console.warn('Popup blocked, attempting redirect sign-in fallback...');
      await signInWithRedirect(auth, googleProvider);
      throw new Error('REDIRECTING');
    }

    throw new Error(error.message || 'Failed to sign in with Google.');
  }
}

/**
 * Handle incoming redirect result if redirect sign-in was triggered on mobile
 */
export async function checkRedirectResult(): Promise<User | null> {
  if (typeof window === 'undefined') return null;
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      syncedUids.add(result.user.uid);
      await syncUserToFirestore(result.user);
    }
    return result?.user ?? null;
  } catch (err: unknown) {
    console.warn('Error checking redirect result:', err);
    return null;
  }
}

/**
 * Signs out current user
 */
export async function signOutUser(): Promise<void> {
  syncedUids.clear();
  await firebaseSignOut(auth);
}

/**
 * Get current user synchronously
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Retrieves the current Firebase ID token for authenticated requests
 */
export async function getCurrentIdToken(forceRefresh: boolean = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch (err) {
    console.error('Failed to obtain Firebase ID token:', err);
    return null;
  }
}

/**
 * Subscribes to authentication state changes
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  initPersistence();
  return onAuthStateChanged(auth, (user) => {
    if (user && !syncedUids.has(user.uid)) {
      syncedUids.add(user.uid);
      syncUserToFirestore(user).catch((err) => {
        console.warn('Background sync to Firestore failed:', err);
      });
    }
    callback(user);
  });
}
