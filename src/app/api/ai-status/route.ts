import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server';

export async function GET(request: Request) {
    // SECURITY HARDENING: Require a secret diagnostic key to prevent info leakage
    const diagnosticKey = request.headers.get('x-diagnostic-key');
    const expectedKey = process.env.DIAGNOSTIC_SECRET;
    
    // Fail-closed: If no secret is configured, deny all diagnostic requests.
    if (!expectedKey || !diagnosticKey || diagnosticKey !== expectedKey) {
        return NextResponse.json({ error: 'Unauthorized: Diagnostics are natively protected.' }, { status: 401 });
    }

    const diagnostics: any = {
        timestamp: new Date().toISOString(),
        environment: {
            node_version: process.version,
            has_gemini_key: !!process.env.GEMINI_API_KEY,
            has_firebase_service_account: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        },
        tests: {
            firebase: { status: 'pending' },
            gemini_flash_latest: { status: 'pending' },
            gemini_2_0: { status: 'pending' },
            gemini_1_5: { status: 'pending' },
        }
    };

    // 1. Test Firebase
    try {
        const { firestore } = initializeFirebase();
        if (firestore) {
            diagnostics.tests.firebase = { status: 'ok', detail: 'Firestore successfully initialized.' };
        } else {
            diagnostics.tests.firebase = { status: 'error', detail: 'Firestore was null after initialization.' };
        }
    } catch (e: any) {
        diagnostics.tests.firebase = { status: 'error', error: e.message };
    }

    // 2. Test Gemini API Key and Models
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        diagnostics.tests.gemini_flash_latest = { status: 'error', detail: 'GEMINI_API_KEY is missing from environment.' };
    } else {
        const testModel = async (modelName: string) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
                });
                const data = await res.json();
                if (res.ok) return { status: 'ok', response: data.candidates?.[0]?.content?.parts?.[0]?.text };
                return { status: 'error', code: res.status, detail: data.error?.message };
            } catch (e: any) {
                return { status: 'error', detail: e.message };
            }
        };

        diagnostics.tests.gemini_flash_latest = await testModel('gemini-flash-latest');
        diagnostics.tests.gemini_2_0 = await testModel('gemini-2.0-flash');
        diagnostics.tests.gemini_1_5 = await testModel('gemini-1.5-flash');
    }

    return NextResponse.json(diagnostics);
}
