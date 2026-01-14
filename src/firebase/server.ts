import { initializeApp, getApps, getApp, FirebaseApp, App } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';

// This is the service account key file that you download from your Firebase project settings.
// It should be stored securely and not exposed on the client side.
// In a production environment, you would use environment variables.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

let firebaseAdminApp: admin.App;

export function initializeFirebase() {
  if (!admin.apps.length) {
    if (!serviceAccount) {
      console.warn('Firebase Admin service account is not configured. Set FIREBASE_SERVICE_ACCOUNT env variable. Push notifications will not work.');
      // Create a dummy app to avoid crashing the server.
      // The functions that use it will check for the actual service account.
      firebaseAdminApp = {} as admin.App;
    } else {
       firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } else {
    firebaseAdminApp = admin.app();
  }

  return {
    firestore: admin.firestore(firebaseAdminApp),
    firebaseAdminApp
  };
}
