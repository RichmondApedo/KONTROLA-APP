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
    if (!secretKey || secretKey === 'your_paystack_secret_key_here') {
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
        const { paystackCustomerCode } = userProfile;

        if (!paystackCustomerCode) {
            // User has no subscription to cancel, which is a success case.
            return NextResponse.json({ success: true, message: 'User had no active subscription.' });
        }

        // Find active subscription from Paystack
        const subResponse = await fetch(`https://api.paystack.co/subscription?customer=${paystackCustomerCode}&status=active`, {
            headers: { Authorization: `Bearer ${secretKey}` },
        });

        if (!subResponse.ok) {
            throw new Error('Failed to fetch subscription details from Paystack.');
        }

        const subData = await subResponse.json();

        // If no active subscription found on Paystack, just sync our DB to reflect that.
        if (!subData.status || subData.data.length === 0) {
            await updateDoc(profileRef, {
                plan: 'free',
                subscriptionStatus: 'inactive',
            });
            return NextResponse.json({ success: true, message: 'No active subscription found on Paystack. Plan set to free.' });
        }
        
        const subscription = subData.data[0];
        const { subscription_code, email_token } = subscription;

        if (!subscription_code || !email_token) {
             return NextResponse.json({ error: 'Could not find subscription code or token to disable.' }, { status: 400 });
        }

        // Disable subscription on Paystack
        const disableResponse = await fetch(`https://api.paystack.co/subscription/disable`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${secretKey}`,
            },
            body: JSON.stringify({ code: subscription_code, token: email_token }),
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
