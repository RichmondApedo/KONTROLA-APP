import * as admin from 'firebase-admin';

// This is the service account key file that you download from your Firebase project settings.
// It should be stored securely and not exposed on the client side.
// In a production environment, you would use environment variables.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

let firebaseAdminApp: admin.App | null = null;
let firestore: admin.firestore.Firestore | null = null;

// This logic runs once when the module is first imported on the server.
if (!admin.apps.length) {
  if (serviceAccount) {
     firebaseAdminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firestore = admin.firestore(firebaseAdminApp);
  } else {
    // Log a warning if the service account isn't set.
    // Backend features requiring Admin SDK will not work.
    console.warn('Firebase Admin service account is not configured. Set FIREBASE_SERVICE_ACCOUNT env variable. Backend features like push notifications and account linking will not work.');
  }
} else {
  // If already initialized, get the existing app and firestore instances.
  firebaseAdminApp = admin.app();
  firestore = admin.firestore(firebaseAdminApp);
}

/**
 * Returns the initialized Firebase Admin App and Firestore instances.
 * If the service account is not configured, these will be null.
 */
export function initializeFirebase() {
  return {
    firestore,
    firebaseAdminApp
  };
}
