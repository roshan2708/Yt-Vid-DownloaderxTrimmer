import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment variables are loaded
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

let appInstance: App | null = null;

/**
 * Initializes Firebase Admin SDK using environment variables
 * Supports both full service account credentials (cert) and public verification via projectId
 */
export function getFirebaseAdminApp(): App | null {
  if (appInstance) return appInstance;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    appInstance = getApp();
    return appInstance;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'clipkaro-effc2';

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Handle newline formatting in private key
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  // Strategy 1: Full service account cert if credentials are provided
  if (projectId && clientEmail && privateKey) {
    try {
      appInstance = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('[ClipDown Backend] Firebase Admin SDK initialized with Service Account.');
      return appInstance;
    } catch (err) {
      console.error('[ClipDown Backend] Error initializing Firebase Admin SDK with cert:', err);
    }
  }

  // Strategy 2: Project ID initialization for token verification via Google public certs
  if (projectId) {
    try {
      appInstance = initializeApp({ projectId });
      console.log(`[ClipDown Backend] Firebase Admin SDK initialized with Project ID: ${projectId}`);
      return appInstance;
    } catch (err) {
      console.error('[ClipDown Backend] Error initializing Firebase Admin SDK with projectId:', err);
    }
  }

  console.warn(
    '[ClipDown Backend] Firebase Project ID is not configured (FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID).'
  );
  return null;
}

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

/**
 * Verifies Firebase ID Token from request
 */
export async function verifyFirebaseIdToken(token: string): Promise<AuthenticatedUser | null> {
  if (!token) return null;

  const app = getFirebaseAdminApp();
  if (!app) {
    throw new Error('Firebase Admin SDK is not configured on the server. Please check your Firebase Project ID.');
  }

  try {
    const auth = getAuth(app);
    const decodedToken = await auth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid token';
    console.warn('[ClipDown Backend] Token verification failed:', msg);
    return null;
  }
}
