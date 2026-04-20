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

    const publicKey = process.env.MONO_PUBLIC_KEY;

    if (!publicKey || publicKey === 'your_mono_public_key_here') {
      console.warn("⚠️ [Mono] Public key is missing or not configured correctly in .env / Vercel Settings.");
      return NextResponse.json({ 
          publicKey: null, 
          isTestKey: false,
          error: 'Mono account linking not configured on the server.' 
      });
    }

    // Security check: Only return public keys. Secret keys (sk_) must never be exposed.
    if (!publicKey.startsWith('pk_') && !publicKey.startsWith('test_pk_')) {
       console.error("❌ [Mono] Invalid Public Key format detected. Keys must start with 'pk_' or 'test_pk_'.");
       return NextResponse.json({ publicKey: null, error: 'Invalid Payment key format.' });
    }

    // A simple check to determine if the key is a test key.
    const isTestKey = publicKey.startsWith('test_pk_');

    return NextResponse.json({ publicKey, isTestKey });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}


