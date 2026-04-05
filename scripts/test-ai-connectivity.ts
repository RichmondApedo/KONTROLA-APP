
import { askKontrola } from '../src/ai/flows/ask-kontrola-flow';
import dotenv from 'dotenv';
import path from 'path';

// Manual env load if needed, but we'll run with --env-file
// dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runTest() {
    console.log("🤖 Testing AI Connectivity (Ask KONTROLA)...");
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
        console.error("❌ GEMINI_API_KEY is missing or a placeholder. Please update your .env file.");
        process.exit(1);
    }

    try {
        const result = await askKontrola({
            question: "Hello! Who are you?",
            currentDate: new Date().toLocaleDateString(),
            profile: {
                firstName: "Test User",
                plan: "premium",
                preferredCurrency: "GHS"
            },
            userId: "test-user-id"
        });

        console.log("\n✅ AI Response Received:");
        console.log("------------------------");
        console.log(result.answer);
        console.log("------------------------");
        console.log("\n🚀 Connectivity Test Passed!");
    } catch (error: any) {
        console.error("\n❌ AI Connectivity Test Failed!");
        console.error("Error:", error.message || error);
        
        if (error.message?.includes("API_KEY_INVALID")) {
            console.error("💡 Action: Your GEMINI_API_KEY appears to be invalid. Please check https://aistudio.google.com/app/apikey");
        }
    }
}

runTest();
