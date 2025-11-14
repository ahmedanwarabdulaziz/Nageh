import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

declare global {
  var _firebaseAdminApp: App | undefined;
}

function loadServiceAccount() {
  // During build time, skip initialization to prevent errors
  // Only check NEXT_PHASE as it's the most reliable indicator
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (privateKey) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    
    if (!projectId || !clientEmail) {
      throw new Error(
        'Firebase admin configuration incomplete. Missing FIREBASE_ADMIN_PROJECT_ID or FIREBASE_ADMIN_CLIENT_EMAIL. Please set all three: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in Vercel.'
      );
    }
    
    return {
      projectId,
      clientEmail,
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

function initializeFirebaseAdmin(): App | null {
  // Skip initialization during build
  // Only check NEXT_PHASE as it's the most reliable indicator
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }

  if (global._firebaseAdminApp) {
    return global._firebaseAdminApp;
  }

  if (getApps().length > 0) {
    global._firebaseAdminApp = getApp();
    return global._firebaseAdminApp;
  }

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    return null;
  }

  global._firebaseAdminApp = initializeApp({
    credential: cert(serviceAccount),
  });

  return global._firebaseAdminApp;
}

// Lazy initialization - only initialize when actually called at runtime
let _adminApp: App | null = null;
let _adminAuthInstance: ReturnType<typeof getAuth> | null = null;
let _adminDbInstance: ReturnType<typeof getFirestore> | null = null;

function getFirebaseAdminApp(): App {
  if (!_adminApp) {
    try {
      _adminApp = initializeFirebaseAdmin();
      if (!_adminApp) {
        // If we're not in build phase but got null, it means credentials are missing
        if (process.env.NEXT_PHASE !== 'phase-production-build') {
          throw new Error(
            'Firebase admin credentials are not configured. Please set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in Vercel environment variables.'
          );
        }
        throw new Error('Firebase admin is not available during build time.');
      }
    } catch (error) {
      // Re-throw with more context if it's our error, otherwise wrap it
      if (error instanceof Error && error.message.includes('Firebase admin')) {
        throw error;
      }
      throw new Error(
        `Failed to initialize Firebase Admin: ${error instanceof Error ? error.message : String(error)}. Please check your environment variables in Vercel.`
      );
    }
  }
  return _adminApp;
}

export function getAdminAuth() {
  if (!_adminAuthInstance) {
    _adminAuthInstance = getAuth(getFirebaseAdminApp());
  }
  return _adminAuthInstance;
}

export function getAdminDb() {
  if (!_adminDbInstance) {
    _adminDbInstance = getFirestore(getFirebaseAdminApp());
  }
  return _adminDbInstance;
}

// Lazy getters for backward compatibility - these are only accessed at runtime
// Use Proxy to intercept all property access and method calls
export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop) {
    const auth = getAdminAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (auth as Record<string, any>)[prop as string];
    if (typeof value === 'function') {
      return value.bind(auth);
    }
    return value;
  },
}) as ReturnType<typeof getAuth>;

export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_target, prop) {
    const db = getAdminDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (db as Record<string, any>)[prop as string];
    if (typeof value === 'function') {
      return value.bind(db);
    }
    return value;
  },
}) as ReturnType<typeof getFirestore>;

// Lazy getter - only accessed at runtime, not during build
// This prevents any access during build time
export const firebaseAdminApp = new Proxy({} as App, {
  get(_target, prop) {
    // During build, return undefined for any property access
    const isBuildTime =
      process.env.NEXT_PHASE === 'phase-production-build' ||
      (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV) ||
      process.argv.includes('build');
    
    if (isBuildTime) {
      return undefined;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getFirebaseAdminApp() as Record<string, any>)[prop as string];
  },
});


