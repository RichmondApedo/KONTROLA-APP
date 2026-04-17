export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/firebase/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { firebaseAdminApp } = initializeFirebase();
  if (!firebaseAdminApp) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  try {
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await admin.auth(firebaseAdminApp).verifyIdToken(idToken);

    const vapidKey = process.env.FIREBASE_VAPID_KEY;

    if (!vapidKey) {
      return NextResponse.json({ vapidKey: null });
    }

    return NextResponse.json({ vapidKey });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

