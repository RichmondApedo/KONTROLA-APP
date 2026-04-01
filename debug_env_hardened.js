/**
 * debug_env_hardened.js
 * Run this script locally to verify your environment variables are correctly formatted.
 * Usage: node debug_env_hardened.js
 */

const fs = require('fs');
const path = require('path');

function checkEnv() {
    console.log("🔍 Checking Environment Configuration...");

    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error("❌ .env file not found in the root directory.");
        return;
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    const requiredKeys = [
        'GEMINI_API_KEY',
        'PAYSTACK_PUBLIC_KEY',
        'PAYSTACK_SECRET_KEY',
        'FIREBASE_SERVICE_ACCOUNT',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
    ];

    requiredKeys.forEach(key => {
        const found = lines.find(line => line.startsWith(`${key}=`));
        if (found) {
            const value = found.split('=')[1].trim();
            if (!value || value.includes('your_') || value.includes('<your_')) {
                console.warn(`⚠️  ${key} is present but appears to be a placeholder: "${value}"`);
            } else {
                // Special check for JSON
                if (key === 'FIREBASE_SERVICE_ACCOUNT') {
                    try {
                        let sa = value;
                        if (sa.startsWith("'") && sa.endsWith("'")) sa = sa.slice(1, -1);
                        JSON.parse(sa);
                        console.log(`✅ ${key} is valid JSON.`);
                    } catch (e) {
                        console.error(`❌ ${key} is NOT valid JSON. Errors might occur.`);
                    }
                } else {
                    console.log(`✅ ${key} is set.`);
                }
            }
        } else {
            console.error(`❌ ${key} is MISSING from .env.`);
        }
    });

    console.log("\n💡 REMINDER: Ensure these same keys are added to your Vercel Dashboard (Settings > Environment Variables).");
}

checkEnv();
