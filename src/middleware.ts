import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for Rate Limiting and Security.
 * Note: In-memory rate limiting is per-instance. For multi-node or 
 * serverless production (Vercel), consider Upstash Redis.
 */

const rateLimitMap = new Map<string, { count: number, lastReset: number }>();

const LIMIT = 20; // 20 requests
const WINDOW = 60 * 1000; // per 1 minute

export function middleware(request: NextRequest) {
    const ip = request.ip ?? '127.0.0.1';
    const path = request.nextUrl.pathname;

    // Only rate limit sensitive API routes
    if (path.startsWith('/api/paystack') || path.startsWith('/api/ai') || path.startsWith('/api/cron')) {
        const now = Date.now();
        const key = `${ip}:${path}`;
        const userData = rateLimitMap.get(key) || { count: 0, lastReset: now };

        if (now - userData.lastReset > WINDOW) {
            userData.count = 1;
            userData.lastReset = now;
        } else {
            userData.count++;
        }

        rateLimitMap.set(key, userData);

        if (userData.count > LIMIT) {
            return new NextResponse(JSON.stringify({ 
                error: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil((WINDOW - (now - userData.lastReset)) / 1000)
            }), { 
                status: 429,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/api/:path*',
};
