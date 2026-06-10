export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server';
import type { UserProfile } from '@/lib/types';
import * as admin from 'firebase-admin';
import { sanitizeObject } from '@/lib/sanitization';
import { logAuditAction } from '@/lib/audit-logger';
import { getSafeErrorMessage } from '@/lib/error-utils';


/**
 * A helper function to cancel a Paystack subscription.
 * It's designed to be called in a non-blocking way.
 */
async function cancelOldSubscription(secretKey: string, subscriptionCode: string) {
    // To disable a subscription via API, we need its email_token.
    // We must first fetch the subscription details using its code.
    const subDetailsResponse = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
         headers: { Authorization: `Bearer ${secretKey}` },
    });

    if (!subDetailsResponse.ok) {
        throw new Error(`Could not fetch details for old subscription ${subscriptionCode}.`);
    }

    const subDetailsData = await subDetailsResponse.json();

    if (!subDetailsData.status || !subDetailsData.data.email_token) {
        // This can happen if the subscription is already inactive. It's safe to ignore.
        console.log(`Old subscription ${subscriptionCode} has no email_token or is inactive. No cancellation needed.`);
        return;
    }

    const emailToken = subDetailsData.data.email_token;

    const disableResponse = await fetch(`https://api.paystack.co/subscription/disable`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secretKey}`,
        },
        body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
    });

    if (!disableResponse.ok) {
        const errorData = await disableResponse.json().catch(()=>({}));
        throw new Error(`Paystack API failed to disable old subscription ${subscriptionCode}: ${errorData.message || 'Unknown error'}`);
    }

    console.log(`Successfully disabled old Paystack subscription ${subscriptionCode}.`);
}


export async function POST(request: NextRequest) {
        const { firestore, firebaseAdminApp } = initializeFirebase();
        if (!firestore || !firebaseAdminApp) {
            return NextResponse.json({ error: 'Server not configured for Firebase.' }, { status: 500 });
        }

        const secretKey = process.env.PAYSTACK_SECRET_KEY || 'sk_live_f635f438d25ab2bb94a309d09d5f5bb2b1881635';
        if (!secretKey) {
            return NextResponse.json({ error: 'Paystack secret key not configured.' }, { status: 500 });
        }
        
        try {
            const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
            if (!idToken) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            const decodedToken = await admin.auth(firebaseAdminApp).verifyIdToken(idToken);
            const userId = decodedToken.uid;

            // Sanitize the incoming request data
            const rawBody = await request.json();
            const { reference, plan, planCode } = sanitizeObject(rawBody);

            if (!reference || !plan || !userId || !planCode) {
                return NextResponse.json({ error: 'Missing required payment details.' }, { status: 400 });
            }

        const profileRef = firestore.doc(`users/${userId}/profile/${userId}`);
        
        // 1. Get user's current subscription details *before* verification
        const profileSnap = await profileRef.get();
        const oldProfileData = profileSnap.exists ? profileSnap.data() as UserProfile : null;
        const oldSubscriptionCode = oldProfileData?.paystackSubscriptionCode;

        // 2. Verify the new transaction with Paystack
        const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${secretKey}` },
        });

        if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to connect to payment gateway for verification.');
        }
        
        const verifyData = await verifyResponse.json();

        if (!verifyData.status || verifyData.data.status !== 'success') {
            throw new Error(verifyData.message || 'Payment verification failed with Paystack.');
        }

        // 3. Security Check: Verify the payer's email matches the authenticated user's email
        // This prevents one user from using another's successful reference to upgrade their own account.
        const payerEmail = verifyData.data.customer?.email?.toLowerCase();
        const authEmail = decodedToken.email?.toLowerCase();

        if (payerEmail && authEmail && payerEmail !== authEmail) {
            console.error(`[Security Alert] Payer email (${payerEmail}) does not match authenticated user email (${authEmail}) for reference ${reference}.`);
            await logAuditAction({
                action: 'SECURITY_ALERT',
                resourceId: reference,
                metadata: {
                    alert: 'PAYMENT_EMAIL_MISMATCH',
                    payerEmail,
                    authEmail
                }
            }, userId);
            throw new Error('Payment email discrepancy detected. This transaction does not belong to your account.');
        }

        // 4. Extract new subscription details...
        const { authorization, customer, plan: verifyPlanCode, plan_object, subscription } = verifyData.data;
        
        // Try multiple paths for subscription_code as Paystack's response structure can vary based on the specific transaction type
        const newSubscriptionCode = 
            verifyData.data?.subscription_code || 
            authorization?.subscription_code || 
            plan_object?.subscription_code || 
            subscription?.subscription_code ||
            verifyData.data?.metadata?.subscription_code;

        const newCustomerCode = customer?.customer_code;
        let nextPaymentDate = authorization?.next_payment_date || subscription?.next_payment_date;

        // If Paystack didn't provide a next payment date (because it's a one-time transaction like MoMo/Card Amount),
        // we manually calculate a 30-day window for our internal subscription management.
        if (!nextPaymentDate) {
            const now = new Date();
            const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
            nextPaymentDate = thirtyDaysFromNow.toISOString();
        }

        // Log critical details for debugging
        if (!newSubscriptionCode) {
            console.warn("Paystack verification success but subscription_code missing. Full data:", JSON.stringify(verifyData.data));
        }

        if (!newCustomerCode) {
            console.error("Paystack verification response missing customer_code:", verifyData.data);
            throw new Error('Could not retrieve customer details from Paystack after verification.');
        }

        // 4. Atomically update Firestore
        // Note: Even if subscription_code is missing, we update the plan if verification was successful ('success')
        // so the user isn't stuck after paying. We'll log the missing code for manual intervention if needed.
        await profileRef.update({
            plan: plan,
            subscriptionStatus: 'active',
            paystackPlanCode: planCode || verifyPlanCode,
            paystackCustomerCode: newCustomerCode,
            paystackSubscriptionCode: newSubscriptionCode || 'ONE_TIME_PAYMENT',
            subscriptionExpiry: new Date(nextPaymentDate),
            paymentReference: reference,
        });

        // Log the successful upgrade to the secure audit trail
        await logAuditAction({
            action: 'PAYMENT_VERIFIED',
            resourceId: reference,
            metadata: {
                plan,
                planCode: planCode || verifyPlanCode,
                subscriptionCode: newSubscriptionCode
            }
        }, userId);

        // 5. AFTER a successful upgrade, attempt to cancel the old subscription if it exists and is different.
        // This is a cleanup step and should not block the success response.
        if (
            oldSubscriptionCode &&
            oldSubscriptionCode !== newSubscriptionCode &&
            oldSubscriptionCode !== 'PENDING_OR_ONETIME' &&
            oldSubscriptionCode !== 'FREE_TRIAL' &&
            oldSubscriptionCode !== 'ONE_TIME_PAYMENT'
        ) {
            console.log(`User ${userId} upgraded. Attempting to cancel old subscription: ${oldSubscriptionCode}`);
            // This is a fire-and-forget attempt. We log errors but don't let them fail the request.
            cancelOldSubscription(secretKey, oldSubscriptionCode).catch(err => {
                console.error(`[Non-critical] Failed to cancel old subscription ${oldSubscriptionCode} for user ${userId}:`, err.message);
            });
        }

        return NextResponse.json({ success: true, message: 'Payment successful and plan updated.' });
    } catch (error: any) {
        const safeMessage = getSafeErrorMessage(error, 'PaystackVerify');
        return NextResponse.json({ error: safeMessage }, { status: 500 });
    }
}
