export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY;

  if (!publicKey || publicKey === 'your_paystack_public_key_here') {
    console.warn("⚠️ [Paystack] Public key is missing or not configured correctly in .env");
    return NextResponse.json({ publicKey: null });
  }

  return NextResponse.json({ publicKey: publicKey.trim() });
}

