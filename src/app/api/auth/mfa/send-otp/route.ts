import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/firebase/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    const resend = new Resend(process.env.RESEND_API_KEY);
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
        const email = decodedToken.email;

        if (!email) {
            return NextResponse.json({ error: 'Verified email required' }, { status: 400 });
        }

        // 1. Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

        // 2. Hash and store in Firestore (Private Collection)
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedOtp = crypto.pbkdf2Sync(otp, salt, 1000, 64, 'sha512').toString('hex');

        await admin.firestore(firebaseAdminApp).doc(`users/${uid}/private/mfa`).set({
            hashedOtp,
            salt,
            expiresAt,
            attempts: 0,
            generatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 3. Send Professional Security Email
        const { error } = await resend.emails.send({
            from: `KONTROLA Security <${process.env.RESEND_FROM_EMAIL || 'notifications@kontrolaapp.com'}>`,
            to: [email],
            subject: `[KONTROLA] ${otp} is your verification code`,
            text: `Your KONTROLA security code is: ${otp}. This code expires in 5 minutes.`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background-color: #ffffff; color: #0f172a; border: 1px solid #f1f5f9; border-radius: 16px;">
                    <div style="margin-bottom: 32px;">
                        <h1 style="margin: 0; font-size: 16px; font-weight: 800; letter-spacing: 0.1em; color: #0f172a;">KONTROLA</h1>
                        <p style="margin: 4px 0 0 0; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #64748b;">Security Operations</p>
                    </div>
                    
                    <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px;">Verify your identity</h2>
                    <p style="font-size: 14px; line-height: 1.5; color: #475569; margin-bottom: 32px;">
                        Someone is attempting to access your financial terminal or modify security settings. Use the code below to authorize this action.
                    </p>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 32px;">
                        <span style="font-family: 'SF Mono', 'Roboto Mono', Menlo, monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.25em; color: #0f172a;">${otp}</span>
                        <p style="margin: 16px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">Valid for 5 minutes</p>
                    </div>
                    
                    <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
                        <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin: 0;">
                            <strong>Security Notice:</strong> KONTROLA staff will never ask for this code over the phone or email. If you did not request this code, your account security may be at risk. Change your password immediately.
                        </p>
                    </div>
                    
                    <div style="margin-top: 40px; text-align: center;">
                        <p style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8;">Protected by KONTROLA Privacy Shield</p>
                    </div>
                </div>
            `,
        });

        if (error) {
            console.error('MFA Email Delivery Failed:', error);
            return NextResponse.json({ error: 'Failed to deliver security code' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Code sent to registered email' });

    } catch (error: any) {
        console.error('MFA Send Error:', error);
        return NextResponse.json({ error: 'Internal security error' }, { status: 500 });
    }
}
