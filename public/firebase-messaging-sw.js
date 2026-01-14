// This file must be in the public directory

importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js");

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
// Use your project's sender ID.
const firebaseConfig = {
  apiKey: "AIzaSyD6y7PX6N1xODtvoOmU2sXlC2m5CSXQBOE",
  authDomain: "studio-8228115140-17e96.firebaseapp.com",
  projectId: "studio-8228115140-17e96",
  storageBucket: "studio-8228115140-17e96.appspot.com",
  messagingSenderId: "80825803456",
  appId: "1:80825803456:web:b5f9d7f8eeacc185138325"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/kontrola-logo.png", // Make sure you have a logo file here
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
