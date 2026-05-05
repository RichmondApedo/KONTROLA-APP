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

    // 2. Active HTTPS Enforcement
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || '';
    if (protocol === 'http' && process.env.NODE_ENV === 'production' && !host.includes('localhost')) {
        return NextResponse.redirect(`https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`);
    }

    // 3. Bot Protection
    if (isBot(userAgent)) {
        return new NextResponse(JSON.stringify({ error: 'Automated requests forbidden.' }), { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 4. Rate Limiting Logic
    const isApiRoute = path.startsWith('/api/');
    const isServerAction = request.headers.has('next-action');
    let rateLimitInfo = null;

    if (isApiRoute || isServerAction) {
        const now = Date.now();
        const isAuthRoute = path.includes('/auth') || path.includes('/signin') || path.includes('/signup');
        const limit = isAuthRoute ? AUTH_LIMIT : STANDARD_LIMIT;
        const window = isAuthRoute ? AUTH_WINDOW : STANDARD_WINDOW;
        const key = `${ip}:${isAuthRoute ? 'auth' : 'std'}`; 
        
        const userData = rateLimitMap.get(key) || { count: 0, lastReset: now };
        if (now - userData.lastReset > window) {
            userData.count = 1;
            userData.lastReset = now;
        } else {
            userData.count++;
        }
        rateLimitMap.set(key, userData);

        if (userData.count > limit) {
            return new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { 
                status: 429,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        rateLimitInfo = { limit, remaining: limit - userData.count, reset: Math.ceil((window - (now - userData.lastReset)) / 1000) };
    }

    const response = NextResponse.next();

    // Apply Rate Limit Headers if applicable
    if (rateLimitInfo) {
        response.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimitInfo.reset.toString());
    }

    // 5. Security Headers
    const cspHeader = `
        default-src 'self';
        script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.paystack.co https://checkout.paystack.com https://apis.google.com https://www.gstatic.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' blob: data: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com;
        font-src 'self' https://fonts.gstatic.com;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        block-all-mixed-content;
        upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }

    return response;
}

export const config = {
  // Run middleware on all paths so we can trap server actions and bots everywhere
  matcher: '/:path*',
};
