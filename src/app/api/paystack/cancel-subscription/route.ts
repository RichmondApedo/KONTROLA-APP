import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/server';
import type { UserProfile } from '@/lib/types';

export async function POST(req: Request) {
    const { firestore } = initializeFirebase();
    if (!firestore) {
        return NextResponse.json({ error: 'Server not configured for Firebase.' }, { status: 500 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
        return NextResponse.json({ error: 'Paystack secret key not configured.' }, { status: 500 });
    }

    try {
        const { userId } = await req.json();
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
        }

        const profileRef = doc(firestore, `users/${userId}/profile/${userId}`);
        const profileSnap = await getDoc(profileRef);

        if (!profileSnap.exists()) {
            return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
        }

        const userProfile = profileSnap.data() as UserProfile;
        const { paystackSubscriptionCode, subscriptionStatus } = userProfile;

        if (!paystackSubscriptionCode || subscriptionStatus !== 'active') {
            // If there's no subscription code or the sub isn't active, there's nothing to cancel.
            return NextResponse.json({ success: true, message: 'User had no active subscription to cancel.' });
        }
        
        // To disable a subscription via API, we need its email_token.
        // We must first fetch the subscription details using its code.
        const subDetailsResponse = await fetch(`https://api.paystack.co/subscription/${paystackSubscriptionCode}`, {
            headers: { Authorization: `Bearer ${secretKey}` },
        });

        if (!subDetailsResponse.ok) {
            throw new Error(`Could not fetch details for subscription ${paystackSubscriptionCode} from Paystack.`);
        }

        const subDetailsData = await subDetailsResponse.json();

        if (!subDetailsData.status || !subDetailsData.data.email_token) {
            // This can happen if the subscription is already inactive on Paystack's end.
            // We can sync our DB state to reflect this.
            await updateDoc(profileRef, { subscriptionStatus: 'inactive', plan: 'free' });
            return NextResponse.json({ success: true, message: 'Subscription already inactive on Paystack. Plan set to free.' });
        }

        const emailToken = subDetailsData.data.email_token;

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
        await updateDoc(profileRef, {
            subscriptionStatus: 'non-renewing',
        });
        
        return NextResponse.json({ success: true, message: 'Subscription successfully set to not renew.' });

    } catch (error: any) {
        console.error('Subscription cancellation failed:', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
