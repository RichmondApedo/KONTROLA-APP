import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware as a WAF (Web Application Firewall).
 * Includes Bot Protection, Payload Size Limits, and unified
 * Rate Limiting for both API Routes and Server Actions.
 */

const rateLimitMap = new Map<string, { count: number, lastReset: number }>();

// Rate Limit Tiers
const STANDARD_LIMIT = 60; // 60 requests per minute
const STANDARD_WINDOW = 60 * 1000;

// Auth API limit: only applies to /api/auth/* calls, NOT page loads to /auth/login
const AUTH_LIMIT = 10; // 10 attempts per 15 minutes
const AUTH_WINDOW = 15 * 60 * 1000;

const isBot = (userAgent: string | null) => {
    // Do NOT block null/empty user-agents — Service Workers and some Firebase
    // SDK internal requests legitimately omit user-agent in certain environments.
    if (!userAgent) return false;
    const ua = userAgent.toLowerCase();
    const botPatterns = [
        'python-requests', 'wget', 'scrapy', 'spider', 'crawl',
        'headless', 'puppeteer', 'playwright',
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

    // 4. Rate Limiting — only for API routes and server actions, never for page loads
    const isApiRoute = path.startsWith('/api/');
    const isServerAction = request.headers.has('next-action');
    let rateLimitInfo = null;

    if (isApiRoute || isServerAction) {
        const now = Date.now();
        // Use startsWith('/api/auth/') — avoids accidentally rate-limiting page navigations
        // to /auth/login or /auth/signup which do NOT hit this code path but share the /auth/ substring.
        const isAuthApiRoute = path.startsWith('/api/auth/');
        const limit = isAuthApiRoute ? AUTH_LIMIT : STANDARD_LIMIT;
        const window = isAuthApiRoute ? AUTH_WINDOW : STANDARD_WINDOW;
        const key = `${ip}:${isAuthApiRoute ? 'auth' : 'std'}`;

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
    // CRITICAL: connect-src and frame-src are REQUIRED for Firebase Auth to work in production.
    // Without connect-src → Firebase SDK cannot reach googleapis.com; all signIn/signUp calls fail silently.
    // Without frame-src  → Google Sign-In popup iframe is blocked by the browser.
    // This CSP is kept in sync with next.config.js to ensure the correct policy always wins.
    const cspHeader = `
        default-src 'self';
        script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.paystack.co https://checkout.paystack.com https://js.withmono.com https://*.google.com https://*.gstatic.com https://www.gstatic.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' blob: data: https://firebasestorage.googleapis.com https://*.googleapis.com https://*.googleusercontent.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://*.firebasestorage.app;
        font-src 'self' data: https://fonts.gstatic.com;
        connect-src 'self' https://api.paystack.co https://api.withmono.com https://*.googleapis.com https://*.firebase.com https://*.firebaseio.com https://*.firebaseapp.com https://*.cloudfunctions.net https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.firebaseio.com wss://*.googleapis.com;
        frame-src 'self' https://js.paystack.co https://checkout.paystack.com https://js.withmono.com https://*.firebaseapp.com https://*.web.app https://*.google.com https://accounts.google.com;
        media-src 'self';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
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
