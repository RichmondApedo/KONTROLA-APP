import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/firebase/server';

export async function POST(request: NextRequest) {
    const { firebaseAdminApp } = initializeFirebase();
    if (!firebaseAdminApp) {
        return NextResponse.json({ error: 'Server not configured for Firebase.' }, { status: 500 });
    }

    try {
        const body = await request.json();
        
        // Ensure only allowed structural events strings process
        if (body.event !== 'AUTH_FAILED' && body.event !== 'BRUTE_FORCE_SUSPECTED') {
            return new NextResponse(JSON.stringify({ error: 'Invalid Event Type' }), { status: 400 });
        }

        let userId = 'ANONYMOUS';
        const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];

        if (idToken) {
            try {
                const decodedToken = await admin.auth(firebaseAdminApp).verifyIdToken(idToken);
                userId = decodedToken.uid;
            } catch (err: any) {
                // If token is invalid and it's not AUTH_FAILED, reject
                if (body.event !== 'AUTH_FAILED') {
                    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
                }
            }
        } else {
            // No token present. For other events, authentication is mandatory.
            if (body.event !== 'AUTH_FAILED') {
                return NextResponse.json({ error: 'Unauthorized: Telemetry requires auth.' }, { status: 401 });
            }
        }

        const ip = (request as any).ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';
        
        // Sanitize and truncate the reason to prevent SIEM log injection/poisoning
        const rawReason = body.reason || 'Authentication service rejected credentials';
        const sanitizedReason = rawReason.substring(0, 500).replace(/[<>]/g, ''); 
        
        // Log to underlying SIEM or Console for Vercel/Firebase Logs
        console.warn(JSON.stringify({
            level: 'WARN',
            event: `SECURITY_AUDIT:${body.event}`,
            uid: userId,
            ip,
            email: body.email || 'OMITTED',
            reason: sanitizedReason,
            timestamp: new Date().toISOString()
        }));

        return new NextResponse(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        return new NextResponse(JSON.stringify({ error: 'Failed to process log' }), { status: 500 });
    }
}
