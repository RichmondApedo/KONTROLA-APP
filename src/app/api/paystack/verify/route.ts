import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server';
import type { UserProfile } from '@/lib/types';

export async function POST(req: Request) {
    const { firestore } = initializeFirebase();
    if (!firestore) {
        return NextResponse.json({ error: 'Server not configured for Firebase.' }, { status: 500 });
    }

    // Securely get the secret key from environment variables.
    // This key should NEVER be exposed on the client side.
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

        const profileRef = firestore.doc(`users/${userId}/profile/${userId}`);
        const profileSnap = await profileRef.get();

        // 2. CRITICAL: Disable any existing subscription for the user to prevent double-billing.
        if (profileSnap.exists()) {
            const userProfile = profileSnap.data() as UserProfile;
            const { paystackCustomerCode } = userProfile;

            // If the user already has a customer code, they might have an active subscription.
            if (paystackCustomerCode) {
                const subResponse = await fetch(`https://api.paystack.co/subscription?customer=${paystackCustomerCode}&status=active`, {
                    headers: { Authorization: `Bearer ${secretKey}` },
                });

                if (subResponse.ok) {
                    const subData = await subResponse.json();
                    if (subData.status && subData.data.length > 0) {
                        const { subscription_code, email_token } = subData.data[0];
                        if (subscription_code && email_token) {
                            // Send the request to Paystack to disable the old subscription.
                            await fetch(`https://api.paystack.co/subscription/disable`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secretKey}` },
                                body: JSON.stringify({ code: subscription_code, token: email_token }),
                            });
                            console.log(`Successfully disabled old subscription ${subscription_code} for user ${userId}.`);
                        }
                    }
                } else {
                    // Log a warning but proceed, as the main goal is to activate the new plan.
                    console.warn(`Could not fetch existing subscriptions for customer ${paystackCustomerCode}. Proceeding with new subscription activation.`);
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
