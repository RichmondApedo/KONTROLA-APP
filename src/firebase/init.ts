'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (getApps().length) {
    // If already initialized, return the SDKs with the already initialized App
    return getSdks(getApp());
  }

  // Always initialize with the explicit config to ensure consistency.
  const firebaseApp = initializeApp(firebaseConfig);
  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  // Explicitly initialize Auth with IndexedDB persistence for robustness,
  // especially in SSR/SSG environments like Next.js. This ensures the
  // auth state is reliably persisted across sessions.
  const auth = initializeAuth(firebaseApp, {
    persistence: indexedDBLocalPersistence,
  });
  
  // Initialize Firestore with long polling enabled.
  // This is a more robust connection method for certain network environments
  // and can help prevent connectivity issues.
  const firestore = initializeFirestore(firebaseApp, {
    experimentalForceLongPolling: true,
  });


  return {
    firebaseApp,
    auth: auth,
    firestore: firestore,
  };
}
