export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.MONO_PUBLIC_KEY;

  if (!publicKey || publicKey === 'your_mono_public_key_here') {
    console.warn("⚠️ [Mono] Public key is missing or not configured correctly in .env / Vercel Settings.");
    return NextResponse.json({ 
        publicKey: null, 
        isTestKey: false,
        error: 'Mono account linking not configured on the server.' 
    });
  }

  // A simple check to determine if the key is a test key.
  const isTestKey = publicKey.startsWith('test_pk_');

  return NextResponse.json({ publicKey, isTestKey });
}


