'use client';

import { FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage as onFirebaseMessage, isSupported, type Unsubscribe } from 'firebase/messaging';

/**
 * Requests notification permission and retrieves the FCM token.
 * @param app The initialized Firebase App instance.
 * @returns The FCM token string if permission is granted, otherwise null.
 */
export async function getMessagingToken(app: FirebaseApp): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('Firebase Messaging is not supported in this browser.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      const messaging = getMessaging(app);
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

      if (!vapidKey) {
        throw new Error('VAPID key for Firebase Messaging is not configured in environment variables.');
      }
      
      const fcmToken = await getToken(messaging, {
        vapidKey: vapidKey,
      });

      if (fcmToken) {
        console.log('FCM Token:', fcmToken);
        return fcmToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        return null;
      }
    } else {
      console.log('Unable to get permission to notify.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
}

/**
 * Subscribes to foreground messages.
 * @param app The initialized Firebase App instance.
 * @param callback The callback to execute when a message is received.
 * @returns A promise that resolves to a function to unsubscribe, or null if not supported.
 */
export async function onMessage(app: FirebaseApp, callback: (payload: any) => void): Promise<Unsubscribe | null> {
    const supported = await isSupported();
    if (supported) {
        const messaging = getMessaging(app);
        return onFirebaseMessage(messaging, callback);
    }
    return null;
}
