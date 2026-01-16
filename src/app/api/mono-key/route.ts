import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY;

  if (!publicKey || publicKey === 'your_mono_public_key_here') {
    return NextResponse.json(
      { error: 'Mono public key not configured on the server.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ publicKey });
}
