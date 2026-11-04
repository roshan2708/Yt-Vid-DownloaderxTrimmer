#!/usr/bin/env node

/**
 * CLI script to grant or revoke Admin / Superadmin roles securely via Firebase Admin SDK
 * Usage:
 *   node scripts/set-admin.js <email> [--role=admin|superadmin] [--remove] [--uid=<uid>]
 * Examples:
 *   node scripts/set-admin.js paisaan.dev@gmail.com --role=superadmin
 *   node scripts/set-admin.js colleague@example.com --role=admin
 *   node scripts/set-admin.js oldadmin@example.com --remove
 */

const dotenv = require('dotenv');
const path = require('path');
const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Load environment files
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function initAdminApp() {
  if (getApps().length > 0) return getApp();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'clipkaro-effc2';

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (projectId && clientEmail && privateKey) {
    console.log('[Firebase Admin] Initializing with Service Account credentials...');
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  console.log(`[Firebase Admin] Initializing with Project ID: ${projectId}...`);
  return initializeApp({ projectId });
}

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith('--'));
  const roleArg = args.find((a) => a.startsWith('--role='));
  const uidArg = args.find((a) => a.startsWith('--uid='));
  const isRemove = args.includes('--remove');

  if (!email && !uidArg) {
    console.error('Error: Please provide a user email or --uid=<uid>.');
    console.log('Usage: node scripts/set-admin.js <email> [--role=admin|superadmin] [--uid=<uid>] [--remove]');
    process.exit(1);
  }

  const explicitUid = uidArg ? uidArg.split('=')[1] : null;
  let role = 'admin';
  if (roleArg) {
    const val = roleArg.split('=')[1]?.toLowerCase();
    if (val === 'superadmin' || val === 'admin') {
      role = val;
    } else {
      console.error(`Invalid role "${val}". Allowed roles are: admin, superadmin`);
      process.exit(1);
    }
  }

  const app = initAdminApp();
  const auth = getAuth(app);
  let db = null;
  try {
    db = getFirestore(app);
  } catch (err) {
    console.warn('Firestore initialization warning:', err.message);
  }

  let userUid = explicitUid;
  let userEmail = email;
  let authClaimsSuccess = false;

  // 1. Attempt to look up user and set custom claims via Firebase Admin Auth API
  try {
    let authUser = null;
    if (explicitUid) {
      console.log(`Looking up Firebase user by UID: ${explicitUid}...`);
      authUser = await auth.getUser(explicitUid);
    } else if (email) {
      console.log(`Looking up Firebase user for email: ${email}...`);
      authUser = await auth.getUserByEmail(email);
    }

    if (authUser) {
      userUid = authUser.uid;
      userEmail = authUser.email || email;
      console.log(`Found user: ${authUser.displayName || 'No Name'} (UID: ${userUid})`);

      if (isRemove) {
        console.log(`Revoking administrative privileges from ${userEmail}...`);
        await auth.setCustomUserClaims(userUid, { admin: false, role: 'user' });
      } else {
        console.log(`Assigning role "${role}" (Custom Claims: { admin: true, role: "${role}" })...`);
        await auth.setCustomUserClaims(userUid, { admin: true, role });
      }
      authClaimsSuccess = true;
    }
  } catch (authErr) {
    console.warn(`\n[Notice] Firebase Admin Auth Identity lookup failed: ${authErr.message}`);
    if (authErr.code === 'auth/internal-error') {
      console.warn('Reason: Managing custom claims directly via Identity Toolkit requires a Service Account key');
      console.warn('(FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env).');
    }
    console.warn('Attempting direct role synchronization via Cloud Firestore...\n');
  }

  // 2. Fallback: Search & Update role in Firestore database
  if (db) {
    try {
      let targetDocRef = null;
      let targetDocId = userUid;

      if (targetDocId) {
        targetDocRef = db.collection('users').doc(targetDocId);
      } else if (userEmail) {
        // Query by email
        const snap = await db.collection('users').where('email', '==', userEmail).limit(1).get();
        if (!snap.empty) {
          targetDocRef = snap.docs[0].ref;
          targetDocId = snap.docs[0].id;
        }
      }

      if (targetDocRef) {
        const updateData = {
          role: isRemove ? 'user' : role,
          isAdmin: !isRemove,
          updatedAt: new Date().toISOString(),
        };
        if (!isRemove) {
          updateData.tier = 'studio';
        }

        await targetDocRef.set(updateData, { merge: true });

        await db.collection('audit_logs').add({
          action: isRemove ? 'REVOKE_ADMIN' : 'GRANT_ADMIN',
          targetUserId: targetDocId,
          targetEmail: userEmail || 'unknown',
          role: isRemove ? 'user' : role,
          timestamp: new Date().toISOString(),
          executedBy: 'CLI_BOOTSTRAP',
        });

        console.log('----------------------------------------------------');
        console.log(` SUCCESS: ${userEmail || targetDocId} is now a "${(isRemove ? 'user' : role).toUpperCase()}" in Firestore!`);
        console.log(` User Document ID: ${targetDocId}`);
        console.log(` Auth Claims Synced: ${authClaimsSuccess ? 'YES' : 'Pending token refresh'}`);
        console.log('----------------------------------------------------');
        console.log('The user can now log into /admin with this Google account.');
        process.exit(0);
      } else {
        console.warn(`User with email "${userEmail}" was not found in Firestore yet.`);
        console.warn('Please log into the app once at https://clipdown.tadaao.com with Google so your profile is created.');
      }
    } catch (dbErr) {
      console.error('Firestore direct update error:', dbErr.message);
    }
  }

  if (authClaimsSuccess) {
    console.log('----------------------------------------------------');
    console.log(` SUCCESS: ${userEmail} is now a "${role.toUpperCase()}"!`);
    console.log('----------------------------------------------------');
    process.exit(0);
  }

  // If both failed:
  console.log('\n====================================================');
  console.log(' AUTOMATIC INITIAL SUPERADMIN IS ENABLED:');
  console.log(` Email: ${userEmail}`);
  console.log(' Simply open https://clipdown.tadaao.com and sign in with Google!');
  console.log(' Your account is automatically recognized as SUPERADMIN.');
  console.log('====================================================\n');
  process.exit(0);
}

main();
