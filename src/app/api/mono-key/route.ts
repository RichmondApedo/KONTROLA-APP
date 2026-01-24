import { NextResponse } from 'next/server';

export async function GET() {
  let publicKey = process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY;
  let isTestKey = false;

  // If the key is not set or is the default placeholder, use the public test key.
  if (!publicKey || publicKey === 'your_mono_public_key_here') {
    publicKey = 'test_pk_zq6n5w00c3mgz46x'; // Mono's public test key
    isTestKey = true;
  }

  return NextResponse.json({ publicKey, isTestKey });
}
