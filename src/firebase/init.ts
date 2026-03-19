'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp): { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } {
  // Explicitly use initializeAuth with indexedDBLocalPersistence for robust session handling,
  // especially for redirect-based sign-in flows on mobile.
  const auth = initializeAuth(firebaseApp, {
    persistence: indexedDBLocalPersistence
  });

  // Initialize Firestore. By default, it uses the most efficient connection
  // method available (gRPC-web), which is ideal for performance.
  const firestore = initializeFirestore(firebaseApp, {});


  return {
    firebaseApp,
    auth,
    firestore,
  };
}
