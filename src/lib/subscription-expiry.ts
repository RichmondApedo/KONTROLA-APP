import { initializeFirebase } from '@/firebase/server';
import { logAuditAction } from '@/lib/audit-logger';
import * as admin from 'firebase-admin';

export interface ExpireResult {
    success: boolean;
    expired: number;
    uids?: string[];
    message?: string;
}

/**
 * Scans all user profiles where `subscriptionExpiry` is in the past
 * and the account is still on an active paid plan, then atomically
 * downgrades them to 'free' / 'inactive'.
 *
 * This covers MoMo and one-time card payments that have no Paystack
 * recurring webhook to trigger the downgrade automatically.
 */
export async function runExpireSubscriptions(): Promise<ExpireResult> {
    const { firestore } = initializeFirebase();

    if (!firestore) {
        console.error('[ExpireSubs] Firestore unavailable.');
        return { success: false, expired: 0, message: 'Firestore unavailable.' };
    }

    try {
        const now = admin.firestore.Timestamp.now();

        // Find all profiles (across every user doc) where the expiry has passed
        // and the subscription is still treated as active.
        const expiredSnap = await firestore
            .collectionGroup('profile')
            .where('subscriptionExpiry', '<=', now)
            .where('subscriptionStatus', 'in', ['active', 'non-renewing'])
            .get();

        if (expiredSnap.empty) {
            console.log('[ExpireSubs] No expired subscriptions found.');
            return { success: true, expired: 0 };
        }

        // Batch-write all downgrades atomically (Firestore batch limit = 500)
        const BATCH_SIZE = 400;
        const docs = expiredSnap.docs.filter((d) => d.data().plan !== 'free');
        const expiredUids: string[] = [];

        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const chunk = docs.slice(i, i + BATCH_SIZE);
            const batch = firestore.batch();

            for (const doc of chunk) {
                batch.update(doc.ref, {
                    plan: 'free',
                    subscriptionStatus: 'inactive',
                    // Intentionally keep subscriptionExpiry & codes for audit history
                });
                expiredUids.push(doc.id);
            }

            await batch.commit();
        }

        // Non-blocking audit trail for each downgraded user
        await Promise.allSettled(
            expiredUids.map((uid) =>
                logAuditAction(
                    {
                        action: 'SUBSCRIPTION_EXPIRED',
                        resourceId: uid,
                        metadata: {
                            reason: 'EXPIRY_DATE_PASSED',
                            downgradedAt: new Date().toISOString(),
                        },
                    },
                    uid
                )
            )
        );

        console.log(
            `[ExpireSubs] Downgraded ${expiredUids.length} expired subscription(s):`,
            expiredUids
        );

        return { success: true, expired: expiredUids.length, uids: expiredUids };
    } catch (error: any) {
        console.error('[ExpireSubs] Error during expiry check:', error);
        return { success: false, expired: 0, message: error.message };
    }
}
