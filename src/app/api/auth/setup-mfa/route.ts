import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/firebase/server';
import { generateBackupCodes, hashMfaToken } from '@/lib/mfa-utils';
import { logAuditAction } from '@/lib/audit-logger';

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

        const { action, code, isBackupCode } = await request.json();

        const db = admin.firestore(firebaseAdminApp);
        const profileRef = db.doc(`users/${uid}/profile/${uid}`);
        const mfaRef = db.doc(`users/${uid}/mfa_verifications/current`);

        if (action === 'generate_codes') {
            const rawCodes = generateBackupCodes();
            const hashedCodes = rawCodes.map(c => hashMfaToken(c, uid));
            
            await profileRef.update({ 
                mfaBackupCodes: hashedCodes,
                mfaSetupPending: true 
            });

            await logAuditAction({
                action: 'MFA_BACKUP_CODES_GENERATED',
                resourceId: uid,
            }, uid);

            return NextResponse.json({ success: true, backupCodes: rawCodes });
        }

        // Activation and Disabling both now REQUIRE a verification challenge
        if (action === 'activate' || action === 'disable') {
            if (!code) {
                return NextResponse.json({ error: 'Verification code is required to modify MFA settings.' }, { status: 400 });
            }

            const profileSnap = await profileRef.get();
            const profile = profileSnap.data();

            let verified = false;

            // 1. Check Backup Code
            if (isBackupCode) {
                const hashedInput = hashMfaToken(code, uid);
                const backupCodes = profile?.mfaBackupCodes || [];
                if (backupCodes.includes(hashedInput)) {
                    verified = true;
                    // Remove used backup code
                    await profileRef.update({ 
                        mfaBackupCodes: backupCodes.filter((c: string) => c !== hashedInput) 
                    });
                }
            } else {
                // 2. Check Standard 6-Digit Code
                const mfaSnap = await mfaRef.get();
                if (mfaSnap.exists) {
                    const mfaData = mfaSnap.data();
                    const hashedInput = hashMfaToken(code, uid);
                    if (mfaData && mfaData.expiresAt.toDate() > new Date() && mfaData.hashedCode === hashedInput) {
                        verified = true;
                        await mfaRef.delete(); // Burn the token
                    }
                }
            }

            if (!verified) {
                return NextResponse.json({ error: 'Invalid or expired verification code.' }, { status: 401 });
            }

            if (action === 'activate') {
                await profileRef.update({ mfaEnabled: true, mfaSetupPending: false });
                await logAuditAction({ action: 'MFA_ENABLED', resourceId: uid }, uid);
                return NextResponse.json({ success: true });
            }

            if (action === 'disable') {
                await profileRef.update({ mfaEnabled: false, mfaBackupCodes: [], mfaSetupPending: false });
                await logAuditAction({ action: 'MFA_DISABLED', resourceId: uid }, uid);
                return NextResponse.json({ success: true });
            }
        }

        return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });

    } catch (error: any) {
        console.error('Setup MFA API Error:', error);
        return NextResponse.json({ error: 'A server error occurred.' }, { status: 500 });
    }
}
