'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, initializeAuth, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { initializeFirestore, Firestore, getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (typeof window !== 'undefined') {
    console.log('[Firebase Diagnostics] Initializing App...', {
      appsCount: getApps().length,
      currentConfig: firebaseConfig
    });
  }

  const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  
  // Temporarily disable App Check as iOS 17+ "Hide IP Address from Trackers" 
  // explicitly blocks reCAPTCHA v3, causing auth/network-request-failed errors.
  /*
  if (typeof window !== 'undefined') {
    try {
        const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
        if (siteKey && siteKey !== 'your_recaptcha_site_key_here' && !siteKey.includes('your_')) {
            initializeAppCheck(firebaseApp, {
                provider: new ReCaptchaV3Provider(siteKey),
                isTokenAutoRefreshEnabled: true
            });
        }
    } catch (e) {
        console.warn('App Check initialization failed:', e);
    }
  }
  */

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp): { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } {
  // Check if Auth is already initialized to prevent multiple initializations.
  let auth: Auth;
  try {
    auth = getAuth(firebaseApp);
  } catch (e) {
    auth = getAuth(firebaseApp);
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
