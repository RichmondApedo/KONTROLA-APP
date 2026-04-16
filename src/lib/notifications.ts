import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/firebase/server';

export type NotificationType = 'bill_reminder' | 'budget_warning' | 'goal_milestone' | 'security_alert' | 'system';

interface SendNotificationOptions {
    userId: string;
    title: string;
    body: string;
    type: NotificationType;
    data?: Record<string, string>;
    saveToHistory?: boolean;
}

/**
 * Utility to send a push notification via FCM and optionally save it to the user's notification history.
 */
export async function sendNotification({
    userId,
    title,
    body,
    type,
    data = {},
    saveToHistory = true
}: SendNotificationOptions) {
    const { firebaseAdminApp, firestore } = initializeFirebase();

    if (!firebaseAdminApp || !firestore) {
        console.error('[Notifications] Firebase Admin not initialized.');
        return { success: false, error: 'Firebase Admin not initialized' };
    }

    try {
        // 1. Fetch User Profile to get FCM Token
        const userDoc = await firestore.collection('users').doc(userId).collection('profile').doc(userId).get();
        const profile = userDoc.data();

        if (!profile) {
            return { success: false, error: 'User profile not found' };
        }

        const fcmToken = profile.fcmToken;
        const notificationsEnabled = profile.notificationsEnabled !== false; // Default to true if not set

        let pushResults = null;

        // 2. Send Push Notification if token exists and enabled
        if (fcmToken && notificationsEnabled) {
            try {
                const message: admin.messaging.Message = {
                    token: fcmToken,
                    notification: {
                        title: title,
                        body: body,
                    },
                    data: {
                        ...data,
                        type: type,
                        click_action: '/dashboard', // Default click action
                    },
                    webpush: {
                        headers: {
                            Urgency: 'high'
                        },
                        notification: {
                            icon: '/icon-192x192.png',
                            badge: '/icon-192x192.png',
                            tag: type, // Group by type
                            renotify: true
                        }
                    }
                };

                const response = await admin.messaging(firebaseAdminApp).send(message);
                pushResults = { success: true, messageId: response };
                console.log(`[Notifications] Sent push to user ${userId}: ${response}`);
            } catch (pushError: any) {
                console.error(`[Notifications] Failed to send push to user ${userId}:`, pushError.message);
                // If token is invalid, we might want to clear it (optional enhancement)
                if (pushError.code === 'messaging/registration-token-not-registered' || pushError.code === 'messaging/invalid-argument') {
                    console.warn(`[Notifications] Clearing invalid token for user ${userId}`);
                    await firestore.collection('users').doc(userId).collection('profile').doc(userId).update({
                        fcmToken: admin.firestore.FieldValue.delete()
                    });
                }
                pushResults = { success: false, error: pushError.message };
            }
        }

        // 3. Save to Notification Center (Firestore History)
        if (saveToHistory) {
            const notificationHistoryRef = firestore.collection('users').doc(userId).collection('notifications');
            const newNotif = {
                title,
                body,
                type,
                data,
                status: 'unread',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            
            await notificationHistoryRef.add(newNotif);
            console.log(`[Notifications] Logged notification to history for user ${userId}`);
        }

        return { success: true, push: pushResults };

    } catch (error: any) {
        console.error('[Notifications] Unexpected Error:', error);
        return { success: false, error: error.message };
    }
}
