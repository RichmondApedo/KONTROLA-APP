import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/firebase/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    const { firebaseAdminApp } = initializeFirebase();
    
    if (!firebaseAdminApp) {
        return NextResponse.json({ error: 'System not ready' }, { status: 500 });
    }

    try {
        const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const decodedToken = await admin.auth(firebaseAdminApp).verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const { code } = await request.json();
        if (!code || code.length !== 6) {
            return NextResponse.json({ error: 'Valid 6-digit code required' }, { status: 400 });
        }

        // 1. Fetch Stored MFA Data
        const mfaRef = admin.firestore(firebaseAdminApp).doc(`users/${uid}/private/mfa`);
        const mfaSnap = await mfaRef.get();

        if (!mfaSnap.exists) {
            return NextResponse.json({ error: 'No active verification session found' }, { status: 400 });
        }

        const mfaData = mfaSnap.data()!;
        
        // 2. Security Checks
        if (mfaData.attempts >= 5) {
            return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 });
        }

        if (Date.now() > mfaData.expiresAt) {
            return NextResponse.json({ error: 'Code has expired' }, { status: 400 });
        }

        // 3. Verify Hash
        const hashedAttempt = crypto.pbkdf2Sync(code, mfaData.salt, 1000, 64, 'sha512').toString('hex');
        
        if (hashedAttempt !== mfaData.hashedOtp) {
            await mfaRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // 4. Success - Update Profile and Clean up
        const profileRef = admin.firestore(firebaseAdminApp).doc(`users/${uid}/profile/${uid}`);
        await profileRef.set({
            mfaEnabled: true,
            mfaType: 'email',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        await mfaRef.delete(); // Verification consumed

        return NextResponse.json({ success: true, message: 'Account secured with Email MFA' });

    } catch (error: any) {
        console.error('MFA Verify Error:', error);
        return NextResponse.json({ error: 'Internal security error' }, { status: 500 });
    }
}
