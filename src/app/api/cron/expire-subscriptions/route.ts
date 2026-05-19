export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/expire-subscriptions
 *
 * Dedicated endpoint for subscription expiry enforcement.
 * Can be triggered independently from the main run-checks cron,
 * e.g. by Vercel Cron at midnight daily.
 *
 * Authorization: Bearer <CRON_SECRET>
 */
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/firebase/server';
import { runExpireSubscriptions } from '@/lib/subscription-expiry';
import { SECURITY_CONFIG } from '@/lib/security-config';

async function executeSubscriptionExpiry(request: Request) {
    const { firebaseAdminApp, firestore: initializedFirestore } = initializeFirebase();
    
    if (!firebaseAdminApp || !initializedFirestore) {
        console.error('❌ [ExpireSubs] Server initialization failed: Admin SDK not configured.');
        return NextResponse.json({ error: 'System configuration error. Check environment variables.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get('secret');
    const authHeader = request.headers.get('authorization') || '';
    
    // Mode 1: Automated Vercel Cron (Bearer Secret or query param)
    const isCronAuthorized = !!process.env.CRON_SECRET && (
        authHeader === `Bearer ${process.env.CRON_SECRET}` || 
        (secretParam !== null && secretParam === process.env.CRON_SECRET)
    );
    
    // Mode 2: Manual Admin Trigger (Firebase ID Token)
    let isAdminAuthorized = false;
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;

    if (idToken && !isCronAuthorized) {
        try {
            const decodedToken = await admin.auth(firebaseAdminApp).verifyIdToken(idToken);
            const userEmail = decodedToken.email;
            const uid = decodedToken.uid;

            // Use centralized security config for super-admin check
            if (userEmail === SECURITY_CONFIG.SUPER_ADMIN_EMAIL) {
                isAdminAuthorized = true;
                console.log(`✅ [ExpireSubs] Super-Admin audit authorized for: ${userEmail}`);
            } else {
                // Secondary check: verify role in Firestore
                const profileSnap = await initializedFirestore.doc(`users/${uid}/profile/${uid}`).get();
                if (profileSnap.exists && profileSnap.data()?.role === 'admin') {
                    isAdminAuthorized = true;
                    console.log(`✅ [ExpireSubs] Admin audit authorized for: ${userEmail}`);
                }
            }
        } catch (e: any) {
            console.error('❌ [ExpireSubs] Admin verification failed:', e.message);
        }
    }

    // Security Guard: Fail if not authorized via Cron secret OR Admin token
    if (!isCronAuthorized && !isAdminAuthorized) {
        console.warn('⚠️ [ExpireSubs] Unauthorized attempt to trigger subscription audit.');
        return NextResponse.json({ error: 'Unauthorized. Administrative privileges required.' }, { status: 401 });
    }

    console.log('🚀 [ExpireSubs] Starting subscription audit...');
    const result = await runExpireSubscriptions();

    if (!result.success) {
        console.error('❌ [ExpireSubs] Audit failed execution:', result.message);
        return NextResponse.json(result, { status: 500 });
    }

    console.log(`✅ [ExpireSubs] Audit complete. Processed: ${result.expired}`);
    return NextResponse.json(result);
}

export async function GET(request: Request) {
    return executeSubscriptionExpiry(request);
}

export async function POST(request: Request) {
    return executeSubscriptionExpiry(request);
}
