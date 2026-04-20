import * as admin from 'firebase-admin';

// This is the service account key file that you download from your Firebase project settings.
// It should be stored securely and not exposed on the client side.
// In a production environment, you would use environment variables.

// Memoized instances to prevent re-initialization
let firebaseAdminApp: admin.app.App | null = null;
let firestore: admin.firestore.Firestore | null = null;

/**
 * Returns the initialized Firebase Admin App and Firestore instances.
 * This function ensures that Firebase Admin is initialized only once (is idempotent).
 * If the service account is not configured, these will be null.
 */
export function initializeFirebase() {
  if (firebaseAdminApp && firestore) {
    return { firestore, firebaseAdminApp };
  }

  // If another part of the server has already initialized, reuse the instance.
  if (admin.apps.length > 0) {
    firebaseAdminApp = admin.app();
    firestore = admin.firestore(firebaseAdminApp);
    return { firestore, firebaseAdminApp };
  }

  let serviceAccount: any;
  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (saEnv) {
    try {
      // Handle cases where the env var might be wrapped in quotes or have escaped characters
      let sanitizedSa = saEnv.trim();
      if (sanitizedSa.startsWith("'") && sanitizedSa.endsWith("'")) {
        sanitizedSa = sanitizedSa.slice(1, -1);
      }
      
      serviceAccount = JSON.parse(sanitizedSa);
    } catch (e) {
      console.error('❌ [Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON string.');
      console.error('Error details:', e instanceof Error ? e.message : String(e));
      if (process.env.NODE_ENV === 'development') {
        console.error('Buffer snippet:', saEnv.substring(0, 50) + '...');
      }
    }
  }

  if (serviceAccount && serviceAccount.project_id) {
    try {
      firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firestore = admin.firestore(firebaseAdminApp);
      console.log('✅ [Firebase Admin] Initialized successfully.');
    } catch (e: any) {
      if (e.code === 'app/duplicate-app') {
        firebaseAdminApp = admin.app();
        firestore = admin.firestore(firebaseAdminApp);
      } else {
        console.error('❌ [Firebase Admin] Initialization failed:', e.message || e);
      }
    }
  } else {
    console.warn('⚠️ [Firebase Admin] Service account not configured or invalid. Backend features (Auth verify, Firestore Admin, Payments) will be limited.');
  }

  return { firestore, firebaseAdminApp };
}

