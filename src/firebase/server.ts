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
      throw new Error('Firebase Admin service account is not configured. Set FIREBASE_SERVICE_ACCOUNT env variable.');
    }
    firebaseAdminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    firebaseAdminApp = admin.app();
  }

  return {
    firestore: admin.firestore(),
    firebaseAdminApp
  };
}
