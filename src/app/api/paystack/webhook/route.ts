import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { initializeFirebase } from '@/firebase/server';
import { logAuditAction } from '@/lib/audit-logger';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
        console.error("Webhook processing failed: PAYSTACK_SECRET_KEY is null.");
        return NextResponse.json({ error: 'System configuration error' }, { status: 500 });
    }

    // 1. Verify Signature
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const hash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
    if (hash !== signature) {
        console.error("Paystack Webhook Signature Verification Failed!");
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const event = payload.event;
    const data = payload.data;

    const { firestore } = initializeFirebase();
    if (!firestore) {
        return NextResponse.json({ error: 'Database uninitialized' }, { status: 500 });
    }

    try {
        if (event === 'charge.success') {
            await handleChargeSuccess(firestore, data);
        } else if (event === 'subscription.disable' || event === 'invoice.payment_failed') {
            await handleSubscriptionFailure(firestore, data, event);
        } else {
            console.log(`[Webhook] Unhandled but acknowledged Paystack Event: ${event}`);
        }
        
        // 200 HTTP OK is strictly required for Paystack Webhook delivery acknowledgment
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error(`Error processing webhook event ${event}:`, err);
        // We still return 200 to prevent Paystack from locking the queue if it's a non-critical logic error, 
        // but typically a 500 triggers retry. Soft errors return 200 so they drop.
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

async function handleChargeSuccess(firestore: admin.firestore.Firestore, data: any) {
    const uid = data.metadata?.uid;
    const planName = data.metadata?.planName;
    const planCode = data.plan?.plan_code;
    const customerCode = data.customer?.customer_code;
    const reference = data.reference;

    if (!uid) {
        console.warn("[Webhook] charge.success missing metadata.uid. Reference:", reference);
        return;
    }

    const profileRef = firestore.doc(`users/${uid}/profile/${uid}`);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) return;

    const currentProfile = profileSnap.data();

    // The robust check: if the client successfully verified synchronously via API earlier, 
    // we do not need to duplicate the upgrade process here. 
    if (currentProfile?.paymentReference === reference && currentProfile?.subscriptionStatus === 'active') {
        console.log(`[Webhook] Charge ${reference} was already successfully integrated synchronously. Skipping duplicate upgrade.`);
        return;
    }

    console.log(`[Webhook] Client-side failure detected! Triggering asynchronous fallback upgrade for ${uid}...`);

    const newSubscriptionCode = data?.authorization?.subscription_code || data?.metadata?.subscription_code;
    let nextPaymentDate = data?.authorization?.next_payment_date || data?.subscription?.next_payment_date;

    // Manual 30-day fallback for internal subscription management
    if (!nextPaymentDate) {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        nextPaymentDate = thirtyDaysFromNow.toISOString();
    }

    await profileRef.update({
        plan: planName || 'premium',
        subscriptionStatus: 'active',
        paystackPlanCode: planCode || admin.firestore.FieldValue.delete(),
        paystackCustomerCode: customerCode,
        paystackSubscriptionCode: newSubscriptionCode || 'ONE_TIME_PAYMENT',
        subscriptionExpiry: new Date(nextPaymentDate),
        paymentReference: reference,
    });

    await logAuditAction({
        action: 'PAYMENT_VERIFIED_VIA_WEBHOOK',
        resourceId: reference,
        metadata: { customerCode, eventFallback: true }
    }, uid);
}

async function handleSubscriptionFailure(firestore: admin.firestore.Firestore, data: any, eventName: string) {
    const customerCode = data.customer?.customer_code;
    const subscriptionCode = data.subscription_code;

    if (!customerCode && !subscriptionCode) {
        console.error("[Webhook] Downgrade event missing critical identifiers (customer_code and subscription_code).");
        return;
    }

    let userDocs: admin.firestore.QueryDocumentSnapshot[] = [];

    // Safely query across all profiles using Collection Group indices
    if (subscriptionCode) {
        const querySnap = await firestore.collectionGroup('profile').where('paystackSubscriptionCode', '==', subscriptionCode).limit(1).get();
        userDocs = querySnap.docs as admin.firestore.QueryDocumentSnapshot[];
    }

    if (userDocs.length === 0 && customerCode) {
        const querySnap = await firestore.collectionGroup('profile').where('paystackCustomerCode', '==', customerCode).limit(1).get();
        userDocs = querySnap.docs as admin.firestore.QueryDocumentSnapshot[];
    }

    if (userDocs.length === 0) {
        console.warn(`[Webhook] Could not map downgrade event to a KONTROLA user profile. C-Code: ${customerCode}, S-Code: ${subscriptionCode}`);
        return;
    }

    const profileDoc = userDocs[0];
    const uid = profileDoc.id;
    const currentProfile = profileDoc.data();

    // Prevent downgrading if they somehow immediately subscribed to a new plan in the meantime 
    // mapping to a different subscription code.
    if (subscriptionCode && currentProfile.paystackSubscriptionCode !== subscriptionCode) {
        console.log(`[Webhook] Overridden by newer subscription. Skipping downgrade of ${uid} for old sub ${subscriptionCode}.`);
        return;
    }

    await profileDoc.ref.update({
        plan: 'free',
        subscriptionStatus: eventName === 'subscription.disable' ? 'inactive' : 'past_due',
    });

    await logAuditAction({
        action: 'DOWNGRADE_VIA_WEBHOOK',
        resourceId: subscriptionCode || customerCode || 'unknown',
        metadata: { eventName }
    }, uid);

    console.log(`[Webhook] Successfully flagged/downgraded user ${uid} following ${eventName}`);
}
