'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';
import { initializeFirestore, Firestore, getFirestore } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp): { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } {
  // Check if Auth is already initialized to prevent multiple initializations.
  let auth: Auth;
  try {
    auth = getAuth(firebaseApp);
  } catch (e) {
    // If not initialized, do so now with indexedDBLocalPersistence for robust session handling,
    // especially for redirect-based sign-in flows on mobile.
    auth = initializeAuth(firebaseApp, {
      persistence: indexedDBLocalPersistence
    });
  }

  // Check if Firestore is already initialized.
  let firestore: Firestore;
  try {
    firestore = getFirestore(firebaseApp);
  } catch (e) {
    // Initialize Firestore. By default, it uses the most efficient connection
    // method available (gRPC-web), which is ideal for performance.
    firestore = initializeFirestore(firebaseApp, {});
  }

  return {
    firebaseApp,
    auth,
    firestore,
  };
}
