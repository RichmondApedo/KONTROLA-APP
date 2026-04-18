import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/firebase/server';
import { generateMfaCode, hashMfaToken } from '@/lib/mfa-utils';

export async function POST(request: NextRequest) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { firebaseAdminApp } = initializeFirebase();
    
    if (!firebaseAdminApp) {
        return NextResponse.json({ error: 'Server not configured for Firebase.' }, { status: 500 });
    }

    try {
        // 1. Authenticate the requester using the ID Token from headers
        const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const decodedToken = await admin.auth(firebaseAdminApp).verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const email = decodedToken.email;

        if (!email) {
            return NextResponse.json({ error: 'User email not found.' }, { status: 400 });
        }

        // 2. Rate Limiting Check
        const db = admin.firestore(firebaseAdminApp);
        const mfaRef = db.doc(`users/${uid}/mfa_verifications/current`);
        const snapshot = await mfaRef.get();
        
        if (snapshot.exists) {
            const data = snapshot.data();
            const lastSent = data?.createdAt?.toDate?.() || 0;
            const now = Date.now();
            const cooldown = 60 * 1000; // 60 seconds

            if (now - lastSent < cooldown) {
                return NextResponse.json({ 
                    error: 'Please wait 60 seconds before requesting a new code.',
                    code: 'rate_limit'
                }, { status: 429 });
            }
        }

        // 3. Generate and Hash Code
        const rawCode = generateMfaCode();
        const hashedCode = hashMfaToken(rawCode, uid);
        const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)); // 10 mins

        // 4. Save to Firestore
        await mfaRef.set({
            hashedCode,
            expiresAt,
            attempts: 0,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 5. Send Email via Resend
        const { error: emailError } = await resend.emails.send({
            from: `KONTROLA Security <${process.env.RESEND_FROM_EMAIL || 'notifications@kontrolaapp.com'}>`,
            to: [email],
            subject: `[Verification Required] Your 6-Digit Security Code`,
            text: `Your KONTROLA security code is: ${rawCode}. This code expires in 10 minutes.`,
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 24px;">Security Verification</h1>
                    <p style="font-size: 14px; color: #64748b; margin-bottom: 32px;">To complete your sign-in, please use the following one-time security code:</p>
                    
                    <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 32px;">
                        <span style="font-size: 32px; font-weight: 800; letter-spacing: 0.2em; color: #0f172a;">${rawCode}</span>
                    </div>
                    
                    <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                        This code is valid for 10 minutes. If you did not request this code, please ignore this email and ensure your password is secure.
                    </p>
                    
                    <div style="margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                        <p style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">KONTROLA SecureAccess</p>
                    </div>
                </div>
            `,
        });

        if (emailError) {
            console.error('MFA Email send failed:', emailError);
            return NextResponse.json({ error: 'Failed to deliver verification email.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, expiresAt });

    } catch (error: any) {
        console.error('MFA API Error:', error);
        return NextResponse.json({ error: 'A server error occurred during MFA verification.' }, { status: 500 });
    }
}
