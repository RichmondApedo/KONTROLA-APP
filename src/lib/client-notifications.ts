import { NotificationType } from './notifications';

interface TriggerNotificationOptions {
    userId: string;
    title: string;
    body: string;
    type: NotificationType;
    data?: Record<string, string>;
}

/**
 * Triggers a notification via the server API.
 * This should be used from the client when a user action triggers an alert.
 */
export async function triggerNotification(options: TriggerNotificationOptions, idToken: string) {
    try {
        const response = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify(options)
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[Client Notifications] Failed to trigger notification:', error);
            return { success: false, error };
        }

        return { success: true };
    } catch (err) {
        console.error('[Client Notifications] Error:', err);
        return { success: false, error: err };
    }
}
