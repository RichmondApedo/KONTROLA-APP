'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development
      if (process.env.NODE_ENV === 'production') {
        console.warn(
          'Automatic initialization failed. Falling back to firebase config object.',
          e
        );
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
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
