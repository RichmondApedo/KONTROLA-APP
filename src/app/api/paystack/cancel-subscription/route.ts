
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server';
import type { UserProfile } from '@/lib/types';
import * as admin from 'firebase-admin';

export async function POST(req: Request) {
    const { firestore, firebaseAdminApp } = initializeFirebase();
    if (!firestore || !firebaseAdminApp) {
        return NextResponse.json({ error: 'Server not configured for Firebase.' }, { status: 500 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
        return NextResponse.json({ error: 'Paystack secret key not configured.' }, { status: 500 });
    }

    try {
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const decodedToken = await admin.auth(firebaseAdminApp).verifyIdToken(idToken);
        const userId = decodedToken.uid;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
        }

        const profileRef = firestore.doc(`users/${userId}/profile/${userId}`);
        const profileSnap = await profileRef.get();

        if (!profileSnap.exists) {
            return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
        }

        const userProfile = profileSnap.data() as UserProfile;
        const { paystackSubscriptionCode } = userProfile;

        // If there's no subscription code, there's nothing to cancel.
        if (!paystackSubscriptionCode) {
            return NextResponse.json({ success: true, message: 'User has no active subscription to cancel.' });
        }
        
        // To disable a subscription via API, we need its email_token.
        // We must first fetch the subscription details using its code.
        const subDetailsResponse = await fetch(`https://api.paystack.co/subscription/${paystackSubscriptionCode}`, {
            headers: { Authorization: `Bearer ${secretKey}` },
        });

        if (!subDetailsResponse.ok) {
            // If the subscription doesn't exist on Paystack (e.g., 404), it's safe to assume it's already cancelled or invalid.
            // Let's clean up our local state to reflect this.
            if (subDetailsResponse.status === 404) {
                await profileRef.update({
                    plan: 'free',
                    subscriptionStatus: 'inactive',
                    paystackSubscriptionCode: admin.firestore.FieldValue.delete(),
                    paystackCustomerCode: admin.firestore.FieldValue.delete(),
                    subscriptionExpiry: admin.firestore.FieldValue.delete(),
                });
                return NextResponse.json({ success: true, message: 'Subscription not found on Paystack. Local profile has been downgraded to Free.' });
            }
            throw new Error(`Could not fetch details for subscription ${paystackSubscriptionCode} from Paystack. Status: ${subDetailsResponse.status}`);
        }

        const subDetailsData = await subDetailsResponse.json();

        // Check if the subscription is already not active on Paystack's end
        if (!subDetailsData.status || subDetailsData.data.status !== 'active') {
            await profileRef.update({
                plan: 'free',
                subscriptionStatus: 'inactive',
            });
            return NextResponse.json({ success: true, message: `Subscription was already in state '${subDetailsData.data.status}' on Paystack. Local profile synced.` });
        }

        const emailToken = subDetailsData.data.email_token;

        if (!emailToken) {
            throw new Error('Could not retrieve the email_token from Paystack, which is required to cancel the subscription.');
        }

        // Disable subscription on Paystack
        const disableResponse = await fetch(`https://api.paystack.co/subscription/disable`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${secretKey}`,
            },
            body: JSON.stringify({ code: paystackSubscriptionCode, token: emailToken }),
        });

        const disableData = await disableResponse.json();

        if (!disableData.status) {
            throw new Error(`Failed to disable subscription on Paystack: ${disableData.message}`);
        }

        // Mark subscription as non-renewing in Firestore, but don't downgrade plan yet.
        // The user should retain access until the expiry date.
        await profileRef.update({
            subscriptionStatus: 'non-renewing',
        });
        
        return NextResponse.json({ success: true, message: 'Subscription successfully set to not renew.' });

    } catch (error: any) {
        console.error('Subscription cancellation failed:', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
