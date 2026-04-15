import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware as a WAF (Web Application Firewall).
 * Includes Bot Protection, Payload Size Limits, and unified
 * Rate Limiting for both API Routes and Server Actions.
 */

const rateLimitMap = new Map<string, { count: number, lastReset: number }>();

// Rate Limit Tiers
const STANDARD_LIMIT = 60; // 60 requests
const STANDARD_WINDOW = 60 * 1000; // per 1 minute

const AUTH_LIMIT = 5; // 5 attempts 
const AUTH_WINDOW = 15 * 60 * 1000; // per 15 minutes

const isBot = (userAgent: string | null) => {
    if (!userAgent) return true; // Block requests without a user agent
    const ua = userAgent.toLowerCase();
    const botPatterns = [
        'curl', 'python-requests', 'wget', 'postman', 'scrapy', 'spider', 'crawl', 'headless', 'puppeteer', 'playwright', 'axios', 'node-fetch'
    ];
    return botPatterns.some(pattern => ua.includes(pattern));
};

export function middleware(request: NextRequest) {
    const ip = (request as any).ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';
    const path = request.nextUrl.pathname;
    const userAgent = request.headers.get('user-agent');

    // 1. Skip system paths and static assets early
    if (path.startsWith('/_next/') || path.includes('/images/') || path.includes('/favicon')) {
        return NextResponse.next();
    }

    // 2. Active HTTPS Enforcement (Prevent Downgrade Attacks)
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || '';
    if (protocol === 'http' && process.env.NODE_ENV === 'production' && !host.includes('localhost')) {
        return NextResponse.redirect(`https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`);
    }

    // 3. Bot & Scraper Protection
    if (isBot(userAgent)) {
        console.warn(JSON.stringify({
            level: 'WARN',
            event: 'SECURITY_AUDIT:BOT_BLOCKED',
            ip,
            userAgent,
            path
        }));
        return new NextResponse(JSON.stringify({ error: 'Access Denied: Automated requests are not permitted.' }), { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 4. Payload Size Enforcement (DoS Prevention)
    const contentLength = request.headers.get('content-length');
    const MAX_SIZE = 1 * 1024 * 1024; // 1MB
    if (['POST', 'PUT', 'PATCH'].includes(request.method) && contentLength && parseInt(contentLength) > MAX_SIZE) {
        console.warn(JSON.stringify({
            level: 'WARN',
            event: 'SECURITY_AUDIT:PAYLOAD_TOO_LARGE',
            ip,
            size: contentLength,
            path
        }));
        return new NextResponse(JSON.stringify({ 
            error: 'Payload Too Large. Maximum allowed size is 1MB.' 
        }), { 
            status: 413,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const isApiRoute = path.startsWith('/api/');
    const isServerAction = request.headers.has('next-action');

    // 4. Rate Limiting for Data & Execution Layers
    if (isApiRoute || isServerAction) {
        const now = Date.now();
        
        const isAuthRoute = path.includes('/auth') || 
                            path.includes('/signin') || 
                            path.includes('/signup');

        const limit = isAuthRoute ? AUTH_LIMIT : STANDARD_LIMIT;
        const window = isAuthRoute ? AUTH_WINDOW : STANDARD_WINDOW;
        const key = `${ip}:${isAuthRoute ? 'auth' : 'std'}:${isServerAction ? 'action' : 'api'}`; 
        
        const userData = rateLimitMap.get(key) || { count: 0, lastReset: now };

        if (now - userData.lastReset > window) {
            userData.count = 1;
            userData.lastReset = now;
        } else {
            userData.count++;
        }

        rateLimitMap.set(key, userData);

        const remaining = Math.max(0, limit - userData.count);
        const resetSeconds = Math.ceil((window - (now - userData.lastReset)) / 1000);

        if (userData.count > limit) {
            console.warn(JSON.stringify({
                level: 'WARN',
                event: 'SECURITY_AUDIT:RATE_LIMIT_EXCEEDED',
                ip,
                path,
                count: userData.count,
                limit
            }));
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

        const response = NextResponse.next();
        response.headers.set('X-RateLimit-Limit', limit.toString());
        response.headers.set('X-RateLimit-Remaining', remaining.toString());
        response.headers.set('X-RateLimit-Reset', resetSeconds.toString());
        
        // Anti-Clickjacking and Security Config
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.headers.set('X-XSS-Protection', '1; mode=block');
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        
        return response;
    }

    return NextResponse.next();
}

export const config = {
  // Run middleware on all paths so we can trap server actions and bots everywhere
  matcher: '/:path*',
};
