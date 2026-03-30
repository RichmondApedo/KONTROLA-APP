import { NextResponse } from 'next/server';

export async function GET() {
  const vapidKey = process.env.FIREBASE_VAPID_KEY;

  if (!vapidKey) {
    return NextResponse.json({ vapidKey: null });
  }

  return NextResponse.json({ vapidKey });
}
