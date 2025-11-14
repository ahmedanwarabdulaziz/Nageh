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
  // Check multiple ways Next.js indicates build phase
  const isBuildTime =
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV ||
    process.argv.includes('build');
  
  if (isBuildTime) {
    return null;
  }

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

function initializeFirebaseAdmin(): App | null {
  // Skip initialization during build
  // Check multiple ways Next.js indicates build phase
  const isBuildTime =
    process.env.NEXT_PHASE === 'phase-production-build' ||
    (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV) ||
    process.argv.includes('build');
  
  if (isBuildTime) {
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
    _adminApp = initializeFirebaseAdmin();
    if (!_adminApp) {
      throw new Error('Firebase admin is not available. Make sure environment variables are set.');
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
export const adminAuth = {
  get createUser() {
    return getAdminAuth().createUser.bind(getAdminAuth());
  },
  get setCustomUserClaims() {
    return getAdminAuth().setCustomUserClaims.bind(getAdminAuth());
  },
  get getUser() {
    return getAdminAuth().getUser.bind(getAdminAuth());
  },
  get updateUser() {
    return getAdminAuth().updateUser.bind(getAdminAuth());
  },
} as ReturnType<typeof getAuth>;

export const adminDb = {
  get collection() {
    return getAdminDb().collection.bind(getAdminDb());
  },
  get doc() {
    return getAdminDb().doc.bind(getAdminDb());
  },
  get batch() {
    return getAdminDb().batch.bind(getAdminDb());
  },
} as ReturnType<typeof getFirestore>;

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


