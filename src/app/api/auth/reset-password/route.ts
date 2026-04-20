import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/firebase/server';

export async function POST(request: NextRequest) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { firebaseAdminApp } = initializeFirebase();
    
    if (!firebaseAdminApp) {
        return NextResponse.json({ error: 'Server not configured for Firebase.' }, { status: 500 });
    }

    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
        }

        // 1. Enumeration Protection: Check if user exists
        let userRecord: admin.auth.UserRecord;
        try {
            userRecord = await admin.auth(firebaseAdminApp).getUserByEmail(email);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // Return success immediately to prevent attackers from querying valid emails
                // We fake a success response identical to a real one.
                return NextResponse.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
            }
            throw error; // Let system errors fall through
        }

        const uid = userRecord.uid;
        const db = admin.firestore(firebaseAdminApp);
        const profileRef = db.doc(`users/${uid}/profile/${uid}`);

        // 2. Transactional Rate Limiting Check
        const rateLimitCheck = await db.runTransaction(async (transaction) => {
            const profileSnap = await transaction.get(profileRef);
            
            // If profile somehow doesn't exist, allow it but create the cooldown tracker.
            if (!profileSnap.exists) {
                transaction.set(profileRef, { lastResetSentAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                return { allowed: true };
            }
            
            const data = profileSnap.data();
            const lastSent = data?.lastResetSentAt?.toDate ? data.lastResetSentAt.toDate().getTime() : 0;
            const now = Date.now();
            const cooldown = 60 * 1000; // 60 seconds

            if (now - lastSent < cooldown) {
                // If it's too soon, block it.
                return { allowed: false };
            }
            
            // If passed, update the timestamp atomically
            transaction.set(profileRef, { lastResetSentAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            return { allowed: true };
        });

        // If rate limited, we STILL return a generic success message.
        // We do not want to give attackers rate-limit feedback that confirms the email exists.
        // They will just quietly not receive additional emails.
        if (!rateLimitCheck.allowed) {
            return NextResponse.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
        }

        // 3. Generate Official Password Reset Link
        const resetLink = await admin.auth(firebaseAdminApp).generatePasswordResetLink(email);

        // 4. Dispatch Email via Resend using the Official Template
        const { error: emailError } = await resend.emails.send({
            from: `KONTROLA Security <${process.env.RESEND_FROM_EMAIL || 'security@kontrolaapp.com'}>`,
            to: [email],
            subject: `Reset your KONTROLA password`,
            text: `
Dear User,

We received a request to reset the password for the KONTROLA account associated with this email address. 

To reset your password and safely regain access to your account, please copy and paste the secure link below into your browser:
${resetLink}

Security Notice:
This link is valid for a limited time. If you did not request a password reset, your account is still secure. Please safely ignore this email and do not click the link above.

If you need further assistance, please contact our support team directly at support@kontrolaapp.com.

Thank you,
The KONTROLA Security Team
            `,
            html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; color: #0f172a;">
                <div style="margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px;">
                    <h1 style="margin: 0; font-size: 18px; font-weight: 800; letter-spacing: 0.1em; color: #0f172a;">KONTROLA</h1>
                    <p style="margin: 4px 0 0 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #64748b;">Security</p>
                </div>
                
                <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px;">Dear User,</p>
                <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
                    We received a request to reset the password for the KONTROLA account associated with this email address.
                </p>
                <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
                    To reset your password and safely regain access to your account, please click the secure link below:
                </p>
                
                <div style="margin-bottom: 32px;">
                    <a href="${resetLink}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">Reset my password</a>
                </div>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
                    <h3 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b;">Security Notice</h3>
                    <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">
                        This link is valid for a limited time. If you did not request a password reset, your account is still secure. Please safely ignore this email and do not click the link above. For your protection, we recommend checking that your current password is strong and not reused across other platforms.
                    </p>
                </div>
                
                <div style="font-size: 12px; color: #64748b; line-height: 1.6;">
                    <p style="margin-bottom: 0; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                        If you need further assistance, please contact our support team directly at support@kontrolaapp.com.
                    </p>
                </div>
                
                <div style="margin-top: 40px; text-align: left;">
                    <p style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8;">
                        Thank you,<br/>
                        The KONTROLA Security Team
                    </p>
                    <p style="margin-top: 12px; font-size: 10px; color: #94a3b8; font-style: italic;">
                        This is an automated message. Please do not reply directly to this email.
                    </p>
                </div>
            </div>
            `,
        });

        if (emailError) {
            console.error('Password Reset Email send failed:', emailError);
            return NextResponse.json({ error: 'Failed to deliver the reset email. Please try again later.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'If the email exists, a reset link has been sent.' });

    } catch (error: any) {
        console.error('Password Reset API Error:', error);
        return NextResponse.json({ error: 'A server error occurred while processing your request.' }, { status: 500 });
    }
}
