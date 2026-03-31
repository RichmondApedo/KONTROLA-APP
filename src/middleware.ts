import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for Rate Limiting and Security.
 * Note: In-memory rate limiting is per-instance. For multi-node or 
 * serverless production (Vercel), consider Upstash Redis.
 */

const rateLimitMap = new Map<string, { count: number, lastReset: number }>();

// Rate Limit Tiers
const STANDARD_LIMIT = 60; // 60 requests
const STANDARD_WINDOW = 60 * 1000; // per 1 minute

const AUTH_LIMIT = 5; // 5 attempts 
const AUTH_WINDOW = 15 * 60 * 1000; // per 15 minutes

export function middleware(request: NextRequest) {
    const ip = (request as any).ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';
    const path = request.nextUrl.pathname;

    // 1. Identify all API routes
    if (path.startsWith('/api/')) {
        const now = Date.now();
        
        // 2. Identify the Tier
        const isAuthRoute = path.includes('/auth') || 
                            path.includes('/signin') || 
                            path.includes('/signup') || 
                            path.includes('/vapid-key') || 
                            path.includes('/mono-key') || 
                            path.includes('/paystack-key');

        const limit = isAuthRoute ? AUTH_LIMIT : STANDARD_LIMIT;
        const window = isAuthRoute ? AUTH_WINDOW : STANDARD_WINDOW;
        const key = `${ip}:${isAuthRoute ? 'auth' : 'std'}:${path}`; // Shared across similar paths? No, per path for now.
        
        const userData = rateLimitMap.get(key) || { count: 0, lastReset: now };

        // 3. Reset Window Logic
        if (now - userData.lastReset > window) {
            userData.count = 1;
            userData.lastReset = now;
        } else {
            userData.count++;
        }

        rateLimitMap.set(key, userData);

        // 4. Payload Size Enforcement (DoS Prevention)
        const contentLength = request.headers.get('content-length');
        const MAX_SIZE = 1 * 1024 * 1024; // 1MB
        if (['POST', 'PUT', 'PATCH'].includes(request.method) && contentLength && parseInt(contentLength) > MAX_SIZE) {
            return new NextResponse(JSON.stringify({ 
                error: 'Payload Too Large. Maximum allowed size is 1MB.' 
            }), { 
                status: 413,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 5. Response Header Preparation
        const remaining = Math.max(0, limit - userData.count);
        const resetSeconds = Math.ceil((window - (now - userData.lastReset)) / 1000);

        // 5. Threshold Block
        if (userData.count > limit) {
            return new NextResponse(JSON.stringify({ 
                error: 'Too many requests. Please try again later.',
                retryAfter: resetSeconds
            }), { 
                status: 429,
                headers: { 
                    'Content-Type': 'application/json',
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': resetSeconds.toString(),
                }
            });
        }

        // 6. Transparent Pass
        const response = NextResponse.next();
        response.headers.set('X-RateLimit-Limit', limit.toString());
        response.headers.set('X-RateLimit-Remaining', remaining.toString());
        response.headers.set('X-RateLimit-Reset', resetSeconds.toString());
        return response;
    }

    return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
