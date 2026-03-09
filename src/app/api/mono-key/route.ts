import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY;

  // In production, we should not fall back to a test key.
  // The client will handle the case where the key is not available.
  if (!publicKey || publicKey === 'your_mono_public_key_here') {
    return NextResponse.json({ publicKey: null, isTestKey: false });
  }

  // A simple check to determine if the key is a test key.
  const isTestKey = publicKey.startsWith('test_pk_');

  return NextResponse.json({ publicKey, isTestKey });
}
