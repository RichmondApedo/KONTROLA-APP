import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/firebase/server';
import { hashMfaToken } from '@/lib/mfa-utils';

export async function POST(request: NextRequest) {
    const { firebaseAdminApp } = initializeFirebase();
    if (!firebaseAdminApp) {
        return NextResponse.json({ error: 'Server not configured for Firebase.' }, { status: 500 });
    }

    try {
        const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const decodedToken = await admin.auth(firebaseAdminApp).verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const { code, isBackupCode } = await request.json();
        if (!code) {
            return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 });
        }

        const db = admin.firestore(firebaseAdminApp);
        const profileRef = db.doc(`users/${uid}/profile/${uid}`);
        const profileSnap = await profileRef.get();
        const profile = profileSnap.data();

        // 1. Handle Backup Code Verification
        if (isBackupCode) {
            const hashedInput = hashMfaToken(code, uid);
            const backupCodes = profile?.mfaBackupCodes || [];
            
            if (backupCodes.includes(hashedInput)) {
                // Remove the used backup code
                const newCodes = backupCodes.filter((c: string) => c !== hashedInput);
                await profileRef.update({ mfaBackupCodes: newCodes });
                return NextResponse.json({ success: true, message: 'Backup code accepted.' });
            } else {
                return NextResponse.json({ error: 'Invalid backup code.', code: 'invalid_backup' }, { status: 400 });
            }
        }

        // 2. Handle 6-Digit Code Verification
        const mfaRef = db.doc(`users/${uid}/mfa_verifications/current`);
        const mfaSnap = await mfaRef.get();
        
        if (!mfaSnap.exists) {
            return NextResponse.json({ error: 'No active verification session.' }, { status: 404 });
        }

        const mfaData = mfaSnap.data();
        
        if (!mfaData) {
            return NextResponse.json({ error: 'Verification data corrupted or missing.' }, { status: 500 });
        }
        
        // Check expiry
        if (mfaData.expiresAt.toDate() < new Date()) {
            return NextResponse.json({ error: 'Verification code has expired.', code: 'expired' }, { status: 400 });
        }

        // Check attempts
        if (mfaData.attempts >= 5) {
            return NextResponse.json({ error: 'Too many failed attempts. Please request a new code.', code: 'too_many_attempts' }, { status: 429 });
        }

        const hashedInput = hashMfaToken(code, uid);

        if (mfaData.hashedCode === hashedInput) {
            // Success: Delete the verification doc to prevent reuse
            await mfaRef.delete();
            return NextResponse.json({ success: true });
        } else {
            // Failure: Increment attempt count
            await mfaRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
            const remaining = 5 - (mfaData.attempts + 1);
            return NextResponse.json({ 
                error: `Invalid code. ${remaining} attempts remaining.`,
                code: 'invalid_code',
                attemptsRemaining: remaining
            }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Verify MFA API Error:', error);
        return NextResponse.json({ error: 'A server error occurred during verification.' }, { status: 500 });
    }
}
