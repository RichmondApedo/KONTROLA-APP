'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  // Use initializeAuth for explicit persistence control. This can resolve
  // issues with popups and redirects, especially in complex applications.
  const auth = initializeAuth(firebaseApp, {
    persistence: indexedDBLocalPersistence,
  });

  // Initialize Firestore. By default, it uses the most efficient connection
  // method available (gRPC-web), which is ideal for performance.
  const firestore = initializeFirestore(firebaseApp, {});


  return {
    firebaseApp,
    auth: auth,
    firestore: firestore,
  };
}
