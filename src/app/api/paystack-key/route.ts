export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY;

  if (!publicKey || publicKey === 'your_paystack_public_key_here') {
    console.warn("⚠️ [Paystack] Public key is missing or not configured correctly in .env / Vercel Settings.");
    return NextResponse.json({ 
        publicKey: null, 
        error: 'Payment system not configured on the server.',
        debug: process.env.NODE_ENV === 'development' ? 'Check PAYSTACK_PUBLIC_KEY in your environment variables.' : undefined
    });
  }

  // Basic validation that it's a real key (should start with pk_)
  if (!publicKey.startsWith('pk_')) {
     console.error("❌ [Paystack] Invalid Public Key format detected. Keys should start with 'pk_'.");
     return NextResponse.json({ publicKey: null, error: 'Invalid Payment key format.' });
  }

  return NextResponse.json({ publicKey: publicKey.trim() });
}


