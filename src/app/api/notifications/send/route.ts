import { NextRequest, NextResponse } from 'next/server';
import { sendNotification, type NotificationType } from '@/lib/notifications';
import { initializeFirebase } from '@/firebase/server';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
    const { firebaseAdminApp } = initializeFirebase();
    if (!firebaseAdminApp) {
        return NextResponse.json({ error: 'Server not configured for Firebase.' }, { status: 500 });
    }

    try {
        const authHeader = request.headers.get('Authorization');
        const systemSecret = request.headers.get('X-System-Secret');
        const CRON_SECRET = process.env.CRON_SECRET;

        let authorized = false;
        let senderUid: string | null = null;

        // 1. Authorization Check (Auth Token OR System Secret)
        if (authHeader?.startsWith('Bearer ')) {
            const idToken = authHeader.split('Bearer ')[1];
            const decodedToken = await admin.auth(firebaseAdminApp).verifyIdToken(idToken);
            senderUid = decodedToken.uid;
            
            // Check if user is admin (optional enhancement)
            const userProfile = await admin.firestore(firebaseAdminApp).collection('users').doc(senderUid).collection('profile').doc(senderUid).get();
            if (userProfile.data()?.role === 'admin') {
                authorized = true;
            }
        } else if (systemSecret && CRON_SECRET && systemSecret === CRON_SECRET) {
            authorized = true;
        }

        if (!authorized) {
            return NextResponse.json({ error: 'Unauthorized. Higher privilege required.' }, { status: 403 });
        }

        // 2. Parse Body
        const { userId, title, body, type, data } = await request.json();

        if (!userId || !title || !body || !type) {
            return NextResponse.json({ error: 'Missing required fields: userId, title, body, type' }, { status: 400 });
        }

        // 3. Dispatch Notification
        const result = await sendNotification({
            userId,
            title,
            body,
            type: type as NotificationType,
            data
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, push: result.push });

    } catch (error: any) {
        console.error('[API Notification Send] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
