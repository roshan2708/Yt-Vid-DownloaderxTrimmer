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
import { auth, googleProvider } from './firebase';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
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
    callback(user);
  });
}
