import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Check if we're in build mode (server-side during build)
const isBuildTime = typeof window === 'undefined' && 
  (process.env.NEXT_PHASE === 'phase-production-build' || 
   (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV));

function getFirebaseConfig() {
  // During build, return a dummy config to prevent initialization errors
  if (isBuildTime) {
    return {
      apiKey: 'dummy-key-for-build',
      authDomain: 'dummy.firebaseapp.com',
      projectId: 'dummy',
      storageBucket: 'dummy.appspot.com',
      messagingSenderId: '123456789',
      appId: '1:123456789:web:dummy',
    };
  }

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  };
}

// Lazy initialization - only initialize when actually accessed
let _firebaseApp: FirebaseApp | null = null;
let _firebaseAuth: Auth | null = null;
let _firestore: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!_firebaseApp) {
    // During build, don't actually initialize Firebase
    if (isBuildTime) {
      // Return a mock object that won't be used
      _firebaseApp = {} as FirebaseApp;
    } else {
      const firebaseConfig = getFirebaseConfig();
      _firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    }
  }
  return _firebaseApp;
}

export function getFirebaseAuth(): Auth {
  if (!_firebaseAuth) {
    if (isBuildTime) {
      // Return a mock that won't be used during build
      _firebaseAuth = {} as Auth;
    } else {
      _firebaseAuth = getAuth(getFirebaseApp());
    }
  }
  return _firebaseAuth;
}

export function getFirestoreInstance(): Firestore {
  if (!_firestore) {
    if (isBuildTime) {
      // Return a mock that won't be used during build
      _firestore = {} as Firestore;
    } else {
      _firestore = getFirestore(getFirebaseApp());
    }
  }
  return _firestore;
}

export function getStorageInstance(): FirebaseStorage {
  if (!_storage) {
    if (isBuildTime) {
      // Return a mock that won't be used during build
      _storage = {} as FirebaseStorage;
    } else {
      _storage = getStorage(getFirebaseApp());
    }
  }
  return _storage;
}

// Export lazy getters for backward compatibility
export const firebaseApp = getFirebaseApp();
export const firebaseAuth = getFirebaseAuth();
export const firestore = getFirestoreInstance();
export const storage = getStorageInstance();


