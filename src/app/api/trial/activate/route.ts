export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server';
import type { UserProfile } from '@/lib/types';
import * as admin from 'firebase-admin';
import { logAuditAction } from '@/lib/audit-logger';
import { getSafeErrorMessage } from '@/lib/error-utils';

const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function POST(request: NextRequest) {
  const { firestore, firebaseAdminApp } = initializeFirebase();

  if (!firestore || !firebaseAdminApp) {
    return NextResponse.json(
      { error: 'Server not configured for Firebase.' },
      { status: 500 }
    );
  }

  try {
    // 1. Authenticate the caller
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const decodedToken = await admin.auth(firebaseAdminApp).verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // 2. Fetch the user's current profile
    const profileRef = firestore.doc(`users/${userId}/profile/${userId}`);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    const profile = profileSnap.data() as UserProfile;

    // 3. Guard: One trial per account — forever
    if (profile.trialUsed === true) {
      return NextResponse.json(
        { error: 'Free trial has already been used on this account.' },
        { status: 403 }
      );
    }

    // 4. Guard: Must be on the free plan to activate a trial
    if (profile.plan !== 'free') {
      return NextResponse.json(
        { error: 'Free trial is only available for accounts on the Free plan.' },
        { status: 403 }
      );
    }

    // 5. Calculate expiry date — 30 days from now
    const now = new Date();
    const trialExpiresAt = new Date(now.getTime() + TRIAL_DURATION_MS);

    // 6. Write to Firestore using Admin SDK (bypasses client security rules)
    await profileRef.update({
      plan: 'pro-plus',
      subscriptionStatus: 'active',
      subscriptionExpiry: admin.firestore.Timestamp.fromDate(trialExpiresAt),
      // Sentinel value used by settings page to display "Trial Active" badge
      paystackSubscriptionCode: 'FREE_TRIAL',
      // Permanently prevent a second trial
      trialUsed: true,
    });

    // 7. Write to the immutable audit trail
    await logAuditAction(
      {
        action: 'TRIAL_ACTIVATED',
        metadata: {
          plan: 'pro-plus',
          trialExpiresAt: trialExpiresAt.toISOString(),
          durationDays: 30,
        },
      },
      userId
    );

    console.log(
      `[Trial] Activated 30-day Pro Plus trial for user ${userId}. Expires: ${trialExpiresAt.toISOString()}`
    );

    return NextResponse.json({
      success: true,
      message: 'Your 30-day Business Suite trial is now active.',
      expiresAt: trialExpiresAt.toISOString(),
    });
  } catch (error: any) {
    const safeMessage = getSafeErrorMessage(error, 'TrialActivate');
    console.error('[Trial] Activation error:', error);
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
