import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

declare global {
  var _firebaseAdminApp: App | undefined;
}

function loadServiceAccount() {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (privateKey) {
    return {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    };
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath && existsSync(credentialsPath)) {
    const buffer = readFileSync(credentialsPath, 'utf8');
    return JSON.parse(buffer);
  }

  const localPath = join(process.cwd(), 'config', 'service-account.json');
  if (existsSync(localPath)) {
    const buffer = readFileSync(localPath, 'utf8');
    return JSON.parse(buffer);
  }

  throw new Error('Firebase admin credentials are not configured.');
}

function initializeFirebaseAdmin(): App {
  if (global._firebaseAdminApp) {
    return global._firebaseAdminApp;
  }

  if (getApps().length > 0) {
    global._firebaseAdminApp = getApp();
    return global._firebaseAdminApp;
  }

  const serviceAccount = loadServiceAccount();
  global._firebaseAdminApp = initializeApp({
    credential: cert(serviceAccount),
  });

  return global._firebaseAdminApp;
}

export const firebaseAdminApp = initializeFirebaseAdmin();
export const adminAuth = getAuth(firebaseAdminApp);
export const adminDb = getFirestore(firebaseAdminApp);


