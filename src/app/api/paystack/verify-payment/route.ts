export const dynamic = 'force-static';
import { NextResponse } from 'next/server';

// This endpoint is deprecated and has been replaced by /api/paystack/verify
export async function POST(req: Request) {
    return NextResponse.json({ error: 'This endpoint is deprecated.' }, { status: 410 });
}
