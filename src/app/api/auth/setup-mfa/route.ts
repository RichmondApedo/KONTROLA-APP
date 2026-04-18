import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/firebase/server';
import { generateBackupCodes, hashMfaToken } from '@/lib/mfa-utils';

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

        const { action } = await request.json();

        const db = admin.firestore(firebaseAdminApp);
        const profileRef = db.doc(`users/${uid}/profile/${uid}`);

        if (action === 'generate_codes') {
            const rawCodes = generateBackupCodes();
            const hashedCodes = rawCodes.map(c => hashMfaToken(c, uid));
            
            // Store hashed codes but don't enable MFA yet
            await profileRef.update({ 
                mfaBackupCodes: hashedCodes,
                mfaSetupPending: true 
            });

            return NextResponse.json({ success: true, backupCodes: rawCodes });
        }

        if (action === 'activate') {
            await profileRef.update({ 
                mfaEnabled: true,
                mfaSetupPending: false 
            });
            return NextResponse.json({ success: true });
        }

        if (action === 'disable') {
            await profileRef.update({ 
                mfaEnabled: false,
                mfaBackupCodes: [],
                mfaSetupPending: false 
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });

    } catch (error: any) {
        console.error('Setup MFA API Error:', error);
        return NextResponse.json({ error: 'A server error occurred.' }, { status: 500 });
    }
}
