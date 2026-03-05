
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server';
import type { UserProfile } from '@/lib/types';

export async function POST(req: Request) {
    const { firestore } = initializeFirebase();
    if (!firestore) {
        return NextResponse.json({ error: 'Server not configured for Firebase.' }, { status: 500 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey || secretKey === 'your_paystack_secret_key_here') {
        const errorMessage = 'Paystack secret key not configured. Please set PAYSTACK_SECRET_KEY in your .env file and restart the development server.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    
    try {
        const { reference, plan, userId, planCode } = await req.json();

        if (!reference || !plan || !userId || !planCode) {
            return NextResponse.json({ error: 'Missing required payment details.' }, { status: 400 });
        }

        // 1. Verify the new transaction with Paystack to ensure it's valid and successful.
        const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${secretKey}` },
        });

        if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json().catch(() => ({}));
            return NextResponse.json({ error: errorData.message || 'Failed to connect to payment gateway for verification.' }, { status: verifyResponse.status });
        }
        
        const verifyData = await verifyResponse.json();

        if (!verifyData.status || verifyData.data.status !== 'success') {
            return NextResponse.json({ error: verifyData.message || 'Payment verification failed with Paystack.' }, { status: 400 });
        }

        // 2. CRITICAL: If this user already has an active subscription, we must disable it before proceeding.
        //    This prevents double-billing.
        const profileRef = firestore.doc(`users/${userId}/profile/${userId}`);
        const profileSnap = await profileRef.get();

        if (profileSnap.exists()) {
            const userProfile = profileSnap.data() as UserProfile;
            const { paystackCustomerCode, subscriptionStatus } = userProfile;

            // Only attempt to cancel if they have a customer code and an active subscription.
            if (paystackCustomerCode && subscriptionStatus === 'active') {
                try {
                    // Find active subscription for the customer
                    const subResponse = await fetch(`https://api.paystack.co/subscription?customer=${paystackCustomerCode}&status=active`, {
                        headers: { Authorization: `Bearer ${secretKey}` },
                    });
                    
                    if (!subResponse.ok) {
                        // If fetching existing subscriptions fails, we should stop to avoid double billing.
                        throw new Error('Could not check for existing subscriptions. Halting to prevent double billing.');
                    }
                    const subData = await subResponse.json();

                    // If an active subscription is found, disable it.
                    if (subData.status && subData.data.length > 0) {
                        const { subscription_code, email_token } = subData.data[0];
                        if (subscription_code && email_token) {
                            const disableResponse = await fetch(`https://api.paystack.co/subscription/disable`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secretKey}` },
                                body: JSON.stringify({ code: subscription_code, token: email_token }),
                            });
                            
                             if (!disableResponse.ok) {
                                // If disabling the old subscription fails, we must stop the process.
                                const errorData = await disableResponse.json().catch(() => ({}));
                                throw new Error(`Failed to disable existing subscription: ${errorData.message || 'Unknown error'}`);
                            }
                            console.log(`Successfully disabled old subscription ${subscription_code} for user ${userId}.`);
                        }
                    }
                } catch (cancelError: any) {
                    console.error('CRITICAL: Failed to cancel existing subscription during upgrade:', cancelError);
                    // Return a clear error to the client. Do not proceed.
                    return NextResponse.json({ error: `Could not disable your old subscription. Please contact support to avoid double billing. Reason: ${cancelError.message}` }, { status: 500 });
                }
            }
        }


        // 3. Update Firestore with the new subscription details.
        const { customer, authorization } = verifyData.data;
        const customerCode = customer?.customer_code;
        const nextPaymentDate = authorization?.next_payment_date;

        if (!customerCode) {
            return NextResponse.json({ error: 'Could not retrieve customer code from Paystack after verification.' }, { status: 400 });
        }

        await profileRef.set({
            plan: plan,
            subscriptionStatus: 'active',
            paystackPlanCode: planCode,
            paystackCustomerCode: customerCode,
            subscriptionExpiry: nextPaymentDate ? new Date(nextPaymentDate) : null,
            paymentReference: reference,
        }, { merge: true });

        return NextResponse.json({ success: true, message: 'Payment successful and plan updated.' });
    } catch (error: any) {
        console.error('Payment verification failed:', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
