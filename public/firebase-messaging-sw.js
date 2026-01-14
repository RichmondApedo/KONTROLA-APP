// This file is intentionally left blank.
// It is used by Firebase Cloud Messaging to handle background notifications.
// The primary logic is handled within the application's service worker registration.

// Scripts for Firebase products are imported in the main app.
// For example, in a Next.js app, you might do this in your _app.tsx or a specific layout.
try {
    importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
    
    // You must provide this config to the service worker.
    // It can't be loaded from environment variables here.
    const firebaseConfig = {
      "projectId": "studio-8228115140-17e96",
      "appId": "1:80825803456:web:b5f9d7f8eeacc185138325",
      "apiKey": "AIzaSyD6y7PX6N1xODtvoOmU2sXlC2m5CSXQBOE",
      "authDomain": "studio-8228115140-17e96.firebaseapp.com",
      "measurementId": "",
      "messagingSenderId": "80825803456"
    };

    firebase.initializeApp(firebaseConfig);

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: '/icon-192x192.png' // Make sure you have an icon in your public folder
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
} catch (e) {
    console.error("Error in firebase-messaging-sw.js", e);
}
