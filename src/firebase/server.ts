import * as admin from 'firebase-admin';

// This is the service account key file that you download from your Firebase project settings.
// It should be stored securely and not exposed on the client side.
// In a production environment, you would use environment variables.

// Memoized instances to prevent re-initialization
let firebaseAdminApp: admin.App | null = null;
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
    if(firebaseAdminApp) {
        firestore = admin.firestore(firebaseAdminApp);
    }
    return { firestore, firebaseAdminApp };
  }

  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (e) {
          console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT. Make sure it is a valid, single-line JSON string.', e);
          serviceAccount = undefined;
      }
  }

  if (serviceAccount) {
    try {
      firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firestore = admin.firestore(firebaseAdminApp);
    } catch (e: any) {
        // This can happen if initialization is attempted multiple times in a hot-reload environment.
        // We can safely ignore it and try to get the existing app.
        if (e.code === 'app/duplicate-app' && admin.apps.length > 0) {
            firebaseAdminApp = admin.app();
            if(firebaseAdminApp) {
                firestore = admin.firestore(firebaseAdminApp);
            }
        } else {
             console.error("Failed to initialize Firebase Admin SDK", e);
        }
    }
  } else {
    // Log a warning if the service account isn't set.
    // Backend features requiring Admin SDK will not work.
    console.warn('Firebase Admin service account is not configured. Set FIREBASE_SERVICE_ACCOUNT env variable. Backend features like cron jobs, server-side account linking, and payment verification will not work.');
  }

  return { firestore, firebaseAdminApp };
}
