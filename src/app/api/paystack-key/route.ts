import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.PAYSTACK_PUBLIC_KEY;

  if (!publicKey || publicKey === 'your_paystack_public_key_here') {
    // Return null if the key is not properly configured on the server.
    // The client will handle this state.
    return NextResponse.json({ publicKey: null });
  }

  return NextResponse.json({ publicKey });
}
