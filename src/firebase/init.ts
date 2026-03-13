'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  // Use getAuth() for the default, robust authentication instance.
  // It handles persistence automatically and is the standard way to get auth.
  const auth = getAuth(firebaseApp);
  
  // Initialize Firestore. By default, it uses the most efficient connection
  // method available (gRPC-web), which is ideal for performance.
  const firestore = initializeFirestore(firebaseApp, {});


  return {
    firebaseApp,
    auth: auth,
    firestore: firestore,
  };
}
