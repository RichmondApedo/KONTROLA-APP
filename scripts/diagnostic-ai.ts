
import { genkit } from 'genkit';
import { googleAI as googleAIPlugin } from '@genkit-ai/google-genai';
import * as admin from 'firebase-admin';

async function runDiagnostic() {
    console.log("🔍 [DIAGNOSTIC] KONTROLA AI System Health Check\n");

    // 1. Check GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('your_')) {
        console.error("❌ GEMINI_API_KEY: Missing or Placeholder.");
    } else {
        try {
            const ai = genkit({ plugins: [googleAIPlugin({ apiKey })] });
            const result = await ai.generate({
                model: 'googleai/gemini-flash-latest',
                prompt: 'ping'
            });
            if (result.text) console.log("✅ GEMINI_API_KEY: Active and connecting.");
        } catch (e: any) {
            console.error(`❌ GEMINI_API_KEY: Connection Failed. (${e.message || 'Unknown Error'})`);
            if (e.message?.includes("expired")) {
                console.error("   💡 Tip: Your API key is expired. Please generate a new one at https://aistudio.google.com/app/apikey");
            }
        }
    }

    // 2. Check FIREBASE_SERVICE_ACCOUNT
    const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!saEnv || saEnv.includes('your_')) {
        console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT: Missing or Placeholder. Server-side features will fail.");
    } else {
        try {
            let sanitizedSa = saEnv.trim();
            if (sanitizedSa.startsWith("'") && sanitizedSa.endsWith("'")) sanitizedSa = sanitizedSa.slice(1, -1);
            const sa = JSON.parse(sanitizedSa);
            console.log(`✅ FIREBASE_SERVICE_ACCOUNT: Valid JSON for project "${sa.project_id}".`);
            
            // 3. Test Database Connectivity
            if (!admin.apps.length) {
                admin.initializeApp({ credential: admin.credential.cert(sa) });
            }
            const db = admin.firestore();
            const collections = await db.listCollections();
            console.log(`✅ FIREBASE_FIRESTORE: Connection Successful (${collections.length} root collections found).`);
        } catch (e: any) {
            console.error(`❌ FIREBASE_CONFIG: Failed! (${e.message || 'Unknown Error'})`);
        }
    }

    // 4. Report Final Status
    console.log("\n--- Diagnostic Complete ---");
}

runDiagnostic();
