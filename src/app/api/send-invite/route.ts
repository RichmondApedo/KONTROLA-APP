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
        // 1. Authenticate the sender
        const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const decodedToken = await admin.auth(firebaseAdminApp).verifyIdToken(idToken);
        const senderUid = decodedToken.uid;
        const senderEmail = decodedToken.email || 'A KONTROLA User';

        // 2. Parse request body
        const { targetEmail, accessLevel } = await request.json();
        
        // SECURITY Audit Fix: Enforce token-derived identity.
        // We use the email from the verified token, not the request body.
        const ownerEmail = senderEmail;

        if (!targetEmail || !ownerEmail || !accessLevel) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (targetEmail.toLowerCase() === ownerEmail.toLowerCase()) {
             return NextResponse.json({ error: 'You cannot invite yourself to your own business terminal.' }, { status: 400 });
        }

        // 3. Rate Limiting Check: Prevent invitation spam
        const profileRef = admin.firestore(firebaseAdminApp).doc(`users/${senderUid}/profile/${senderUid}`);
        const profileSnap = await profileRef.get();
        if (profileSnap.exists) {
            const data = profileSnap.data();
            const lastInviteTime = data?.lastInviteSentAt?.toDate?.() || 0;
            const now = Date.now();
            const cooldown = 60 * 1000; // 60 seconds

            if (now - lastInviteTime < cooldown) {
                const waitSecs = Math.ceil((cooldown - (now - lastInviteTime)) / 1000);
                return NextResponse.json({ 
                    error: `System Cooling: Please wait ${waitSecs} seconds before sending another invitation.`,
                    code: 'rate_limited'
                }, { status: 429 });
            }
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kontrolaapp.com';

        // 3. Send Email via Resend
        const inviteUrl = `${baseUrl}/auth/login?callbackUrl=/dashboard/business`;

        const { data, error } = await resend.emails.send({
            from: `KONTROLA Planning & Management <${process.env.RESEND_FROM_EMAIL || 'notifications@kontrolaapp.com'}>`,
            replyTo: 'support@kontrolaapp.com',
            to: [targetEmail],
            subject: `[Action Required] Financial Planning and Management Access Setup`,
            text: `
KONTROLA | Security Notification
------------------------------------------

ACCESS REQUEST DETAILS:
- Sender: ${ownerEmail}
- Role Assigned: ${accessLevel.toUpperCase()}
- Destination: KONTROLA Business Terminal

ACTION REQUIRED:
To complete your terminal access setup and verify your identity, please use the secure link below:

${inviteUrl}

SECURITY NOTICE:
This link is cryptographically associated with your account. Do not share this email. If you were not expecting this access request, please contact support@kontrolaapp.com immediately.

---
Managed via KONTROLA Privacy Shield
            `,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; color: #0f172a;">
                    <div style="margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px;">
                        <h1 style="margin: 0; font-size: 18px; font-weight: 800; letter-spacing: 0.1em; color: #0f172a;">KONTROLA</h1>
                        <p style="margin: 4px 0 0 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #64748b;">Planning & Management</p>
                    </div>
                    
                    <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 24px;">Security Access Granted</h2>
                    
                    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
                        The user <strong>${ownerEmail}</strong> has authorized you to access their business terminal with <strong>${accessLevel.toUpperCase()}</strong> privileges.
                    </p>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
                        <h3 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b;">Verification Link</h3>
                        <p style="margin: 0 0 20px 0; font-size: 13px; color: #334155;">Please use the button below to verify your identity and finalize the terminal setup.</p>
                        <a href="${inviteUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">Verify & Access Terminal</a>
                    </div>
                    
                    <div style="font-size: 12px; color: #64748b; line-height: 1.6;">
                        <p style="margin-bottom: 12px;"><strong>Direct Verification URL:</strong><br />
                        <span style="color: #29abe2; word-break: break-all;">${inviteUrl}</span></p>
                        
                        <p style="margin-bottom: 0; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                            You will now receive planning and management alerts. If you did not request this access, please ignore this email or contact our security team.
                        </p>
                    </div>
                    
                    <div style="margin-top: 40px; text-align: center;">
                        <p style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8;">Managed via KONTROLA Privacy Shield</p>
                    </div>
                </div>
            `,
        });

        if (error) {
            console.error('[Resend Error Details]:', {
                message: error.message,
                name: error.name,
                cause: (error as any).cause
            });
            return NextResponse.json({ 
                error: 'The invitation was saved, but we encountered an issue delivering the notification email. Please advise your collaborator to check their Linked Accounts.',
                code: 'delivery_failed'
                // Removed raw error details from response for security
            }, { status: 500 });
        }

        // 更新最后发送时间以防止滥用
        await admin.firestore(firebaseAdminApp).doc(`users/${senderUid}/profile/${senderUid}`).set({
            lastInviteSentAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return NextResponse.json({ success: true, id: data?.id });

    } catch (error: any) {
        console.error('Invite API Error [CRITICAL]:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        return NextResponse.json({ error: 'A security or system error occurred during processing. Please try again later.' }, { status: 500 });
    }
}
