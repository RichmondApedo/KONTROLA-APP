export const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-8228115140-17e96",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:80825803456:web:b5f9d7f8eeacc185138325",
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD6y7PX6N1xODtvoOmU2sXlC2m5CSXQBOE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-8228115140-17e96.firebaseapp.com",
  measurementId: "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "80825803456"
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
