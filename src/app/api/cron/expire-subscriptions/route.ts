export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { runExpireSubscriptions } from '@/lib/subscription-expiry';

/**
 * POST /api/cron/expire-subscriptions
 *
 * Dedicated endpoint for subscription expiry enforcement.
 * Can be triggered independently from the main run-checks cron,
 * e.g. by Vercel Cron at midnight daily.
 *
 * Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: Request) {
    const authHeader = request.headers.get('authorization');
    const isAuthorized = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (process.env.CRON_SECRET && !isAuthorized && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runExpireSubscriptions();

    if (!result.success) {
        return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
}
