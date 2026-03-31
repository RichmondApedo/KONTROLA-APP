export const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  measurementId: "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
};

// DIAGNOSTIC LOGGING
if (typeof window !== 'undefined') {
  console.log('[Firebase Diagnostics] Config:', {
    hasProjectId: !!firebaseConfig.projectId,
    hasAppId: !!firebaseConfig.appId,
    hasApiKey: !!firebaseConfig.apiKey,
    apiKeyLength: firebaseConfig.apiKey?.length,
    projectId: firebaseConfig.projectId,
  });
}
