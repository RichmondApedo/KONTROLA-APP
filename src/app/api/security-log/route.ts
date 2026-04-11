import { NextRequest, NextResponse } from 'next/server';

/**
 * INTERNAL SECURITY TELEMETRY ENDPOINT
 * Receives reports of suspicious activity or auth failures from the client
 * and commits them securely to the server logs.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Ensure only allowed structural events strings process
        if (body.event !== 'AUTH_FAILED' && body.event !== 'BRUTE_FORCE_SUSPECTED') {
            return new NextResponse(JSON.stringify({ error: 'Invalid Event Type' }), { status: 400 });
        }

        const ip = (request as any).ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';
        
        // Log to underlying SIEM or Console for Vercel/Firebase Logs
        console.warn(JSON.stringify({
            level: 'WARN',
            event: `SECURITY_AUDIT:${body.event}`,
            ip,
            email: body.email || 'UNKNOWN',
            reason: body.reason || 'Authentication service rejected credentials',
            timestamp: new Date().toISOString()
        }));

        return new NextResponse(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        return new NextResponse(JSON.stringify({ error: 'Failed to process log' }), { status: 500 });
    }
}
