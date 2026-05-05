export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { runExpireSubscriptions } from '@/lib/subscription-expiry';

/**
 * POST /api/cron/expire-subscriptions
 *
 * Dedicated endpoint for subscription expiry enforcement.
 * Can be triggered independently from the main run-checks cron,
 * e.g. by Vercel Cron at midnight daily.
 *
 * Authorization: Bearer <CRON_SECRET>
 */
import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/firebase/server';

export async function POST(request: Request) {
    const { firebaseAdminApp } = initializeFirebase();
    if (!firebaseAdminApp) {
        return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }
    const firestore = admin.firestore(firebaseAdminApp);
    const authHeader = request.headers.get('authorization') || '';
    
    // Mode 1: Automated Vercel Cron (Bearer Secret)
    const isCronAuthorized = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    
    // Mode 2: Manual Admin Trigger (Firebase ID Token)
    let isAdminAuthorized = false;
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;

    if (idToken && !isCronAuthorized && firebaseAdminApp) {
        try {
            const decodedToken = await admin.auth(firebaseAdminApp).verifyIdToken(idToken);
            const userEmail = decodedToken.email;
            const uid = decodedToken.uid;

            if (userEmail === 'richmondapedo549@gmail.com') {
                isAdminAuthorized = true;
            } else {
                // Secondary check: verify role in Firestore
                const profileSnap = await firestore.doc(`users/${uid}/profile/${uid}`).get();
                if (profileSnap.exists && profileSnap.data()?.role === 'admin') {
                    isAdminAuthorized = true;
                }
            }
        } catch (e) {
            console.error('[ExpireSubs] Auth verification failed:', e);
        }
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const hasSecretSet = !!process.env.CRON_SECRET;

    if (isProduction && hasSecretSet && !isCronAuthorized && !isAdminAuthorized) {
        return NextResponse.json({ error: 'Unauthorized Access Denied' }, { status: 401 });
    }

    const result = await runExpireSubscriptions();

    if (!result.success) {
        return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
}
