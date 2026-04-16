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
        const { targetEmail, ownerEmail, accessLevel } = await request.json();

        if (!targetEmail || !ownerEmail || !accessLevel) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 3. Send Email via Resend
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'KONTROLA Business <notifications@kontrolaapp.com>',
            reply_to: 'support@kontrolaapp.com', // Building sender trust via reply-to header
            to: [targetEmail],
            subject: `Action Required: Delegation invite from ${ownerEmail}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1f5fe; border-radius: 12px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #29abe2; margin: 0; font-size: 24px; letter-spacing: -0.02em;">KONTROLA</h1>
                        <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Liquidity Intelligence Terminal</p>
                    </div>
                    
                    <h2 style="color: #0f172a; font-size: 18px; line-height: 1.5;">You've been invited to join a Business Suite.</h2>
                    
                    <p style="color: #334155; font-size: 16px; line-height: 1.6;">
                        <strong>${ownerEmail}</strong> has invited you to join their business terminal as a <span style="text-transform: uppercase; font-weight: bold; color: #29abe2;">${accessLevel}</span>.
                    </p>
                    
                    <div style="background-color: #f8fafc; border-left: 4px solid #29abe2; padding: 15px; margin: 25px 0;">
                        <p style="margin: 0; color: #475569; font-size: 14px;">
                            By accepting this invitation, you will be able to switch terminals and manage their business finances, invoicing, and reporting through your own KONTROLA dashboard.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 35px; margin-bottom: 25px;">
                        <a href="https://kontrolaapp.com/dashboard/business" style="background-color: #29abe2; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">View Invitation in App</a>
                    </div>
                    
                    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 40px; border-top: 1px solid #f1f5f9; pt-20;">
                        This is an automated notification from KONTROLA. If you weren't expecting this, you can safely ignore this email.
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error('[Resend Error Details]:', JSON.stringify(error, null, 2));
            return NextResponse.json({ 
                error: 'The invitation was saved, but we encountered an issue delivering the notification email. Please advise your collaborator to check their Linked Accounts.',
                code: 'delivery_failed'
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: data?.id });

    } catch (error: any) {
        console.error('Invite API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
