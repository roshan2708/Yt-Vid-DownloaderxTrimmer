#!/usr/bin/env node

/**
 * CLI script to grant or revoke Admin / Superadmin roles securely via Firebase Admin SDK
 * Usage:
 *   node scripts/set-admin.js <email> [--role=admin|superadmin] [--remove]
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
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  return initializeApp({ projectId });
}

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith('--'));
  const roleArg = args.find((a) => a.startsWith('--role='));
  const isRemove = args.includes('--remove');

  if (!email) {
    console.error('Error: Please provide a user email.');
    console.log('Usage: node scripts/set-admin.js <email> [--role=admin|superadmin] [--remove]');
    process.exit(1);
  }

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
    console.warn('Firestore initialization warning (falling back to Auth claims only):', err.message);
  }

  try {
    console.log(`Looking up Firebase user for email: ${email}...`);
    const user = await auth.getUserByEmail(email);
    console.log(`Found user: ${user.displayName || 'No Name'} (UID: ${user.uid})`);

    if (isRemove) {
      console.log(`Revoking administrative privileges from ${email}...`);
      await auth.setCustomUserClaims(user.uid, { admin: false, role: 'user' });

      if (db) {
        await db.collection('users').doc(user.uid).set(
          {
            role: 'user',
            isAdmin: false,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        await db.collection('audit_logs').add({
          action: 'REVOKE_ADMIN',
          targetUserId: user.uid,
          targetEmail: email,
          timestamp: new Date().toISOString(),
          executedBy: 'CLI_BOOTSTRAP',
        });
      }

      console.log(`Successfully revoked admin privileges from ${email}.`);
      console.log('User must re-authenticate or refresh their token for changes to take effect.');
      process.exit(0);
    }

    // Grant Admin / Superadmin Claims
    console.log(`Assigning role "${role}" (Custom Claims: { admin: true, role: "${role}" })...`);
    await auth.setCustomUserClaims(user.uid, {
      admin: true,
      role,
    });

    if (db) {
      await db.collection('users').doc(user.uid).set(
        {
          role,
          isAdmin: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await db.collection('audit_logs').add({
        action: 'GRANT_ADMIN',
        targetUserId: user.uid,
        targetEmail: email,
        role,
        timestamp: new Date().toISOString(),
        executedBy: 'CLI_BOOTSTRAP',
      });
    }

    console.log('----------------------------------------------------');
    console.log(` SUCCESS: ${email} is now a "${role.toUpperCase()}"!`);
    console.log(` UID: ${user.uid}`);
    console.log(` Claims: { admin: true, role: "${role}" }`);
    console.log('----------------------------------------------------');
    console.log('Note: If the user is currently logged in, they should sign out and sign back in');
    console.log('      or force a token refresh to update their claims in the browser.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to set admin role:', err.message);
    if (err.code === 'auth/user-not-found') {
      console.error(`User with email "${email}" was not found in Firebase Auth.`);
      console.error('Please have the user log into the application once first with Google.');
    }
    process.exit(1);
  }
}

main();
