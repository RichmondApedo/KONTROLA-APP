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
    // Note: We've removed the mandatory authentication check for the public key retrieval.
    // Public keys are intended for client-side use, and allowing this to be public
    // ensures the pricing page remains functional for guest users and reduces friction.

    let publicKey = (process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY)?.trim();

    if (!publicKey || publicKey === 'your_paystack_public_key_here' || publicKey === '') {
      // Fallback to verified production public key if Vercel serverless environment failed to propagate keys
      publicKey = 'pk_live_b30626656dccbe24a8f318ebb25b260f0caca340';
      console.warn("⚠️ [Paystack API] Using fallback production public key.");
    }

    // Basic validation that it's a real key (should start with pk_)
    if (!publicKey.startsWith('pk_')) {
       console.error("❌ [Paystack] Invalid Public Key format detected. Keys should start with 'pk_'.");
       return NextResponse.json({ publicKey: null, error: 'Invalid Payment key format.' });
    }

    return NextResponse.json({ publicKey: publicKey.trim() });
  } catch (error: any) {
    console.error("❌ [Paystack API Route Error]:", error.message || error);
    return NextResponse.json({ 
        publicKey: null, 
        error: 'Payment system error.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: error.status || 500 });
  }
}


