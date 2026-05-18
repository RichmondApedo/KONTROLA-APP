export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server';
import type { UserProfile } from '@/lib/types';
import * as admin from 'firebase-admin';
import { logAuditAction } from '@/lib/audit-logger';

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
        const userEmail = decodedToken.email;

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
        
        // ... (fetch details logic)
        const subDetailsResponse = await fetch(`https://api.paystack.co/subscription/${paystackSubscriptionCode}`, {
            headers: { Authorization: `Bearer ${secretKey}` },
        });

        if (!subDetailsResponse.ok) {
            if (subDetailsResponse.status === 404) {
                await profileRef.update({
                    plan: 'free',
                    subscriptionStatus: 'inactive',
                    paystackSubscriptionCode: admin.firestore.FieldValue.delete(),
                    paystackCustomerCode: admin.firestore.FieldValue.delete(),
                    subscriptionExpiry: admin.firestore.FieldValue.delete(),
                });

                await logAuditAction({
                    action: 'SUBSCRIPTION_CANCELLED',
                    resourceId: paystackSubscriptionCode,
                    metadata: { reason: 'NOT_FOUND_ON_PAYSTACK', email: userEmail }
                }, userId);

                return NextResponse.json({ success: true, message: 'Subscription not found on Paystack. Local profile has been downgraded to Free.' });
            }
            throw new Error(`Could not fetch details for subscription ${paystackSubscriptionCode} from Paystack.`);
        }

        const subDetailsData = await subDetailsResponse.json();

        if (!subDetailsData.status || subDetailsData.data.status !== 'active') {
            await profileRef.update({ plan: 'free', subscriptionStatus: 'inactive' });
            
            await logAuditAction({
                action: 'SUBSCRIPTION_CANCELLED',
                resourceId: paystackSubscriptionCode,
                metadata: { reason: 'ALREADY_INACTIVE', status: subDetailsData.data.status }
            }, userId);

            return NextResponse.json({ success: true, message: `Subscription was already in state '${subDetailsData.data.status}' on Paystack.` });
        }

        const emailToken = subDetailsData.data.email_token;
        const disableResponse = await fetch(`https://api.paystack.co/subscription/disable`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secretKey}` },
            body: JSON.stringify({ code: paystackSubscriptionCode, token: emailToken }),
        });

        const disableData = await disableResponse.json();
        if (!disableData.status) throw new Error(`Failed to disable subscription: ${disableData.message}`);

        await profileRef.update({ subscriptionStatus: 'non-renewing' });

        await logAuditAction({
            action: 'SUBSCRIPTION_CANCELLED',
            resourceId: paystackSubscriptionCode,
            metadata: { method: 'USER_INITIATED', email: userEmail }
        }, userId);
        
        return NextResponse.json({ success: true, message: 'Subscription successfully set to not renew.' });

    } catch (error: any) {
        console.error('Subscription cancellation failed:', error);
        return NextResponse.json({ error: 'Subscription cancellation failed due to a system error. Please contact support if the issue persists.' }, { status: 500 });
    }
}
