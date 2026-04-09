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
        'MONO_PUBLIC_KEY',
        'MONO_SECRET_KEY',
        'PAYSTACK_PUBLIC_KEY',
        'PAYSTACK_SECRET_KEY',
        'FIREBASE_SERVICE_ACCOUNT',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'CRON_SECRET',
        'FIREBASE_VAPID_KEY'
    ];

    let missing = 0;
    let placeholders = 0;
    let errors = 0;

    requiredKeys.forEach(key => {
        const found = lines.find(line => line.startsWith(`${key}=`));
        if (found) {
            let value = found.substring(found.indexOf('=') + 1).trim();
            // Handle quotes
            if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
                value = value.slice(1, -1);
            }

            if (!value || value.includes('your_') || value.includes('<your_')) {
                console.warn(`⚠️  ${key} is present but appears to be a placeholder: "${value}"`);
                placeholders++;
            } else {
                // Formatting checks
                if (key.includes('PAYSTACK_SECRET') && !value.startsWith('sk_')) {
                    console.error(`❌ ${key} should start with "sk_". Current: "${value.substring(0, 5)}..."`);
                    errors++;
                } else if (key.includes('MONO_SECRET') && !value.startsWith('mono_sk_')) {
                    console.error(`❌ ${key} should start with "mono_sk_". Current: "${value.substring(0, 8)}..."`);
                    errors++;
                } else if (key === 'FIREBASE_SERVICE_ACCOUNT') {
                    try {
                        JSON.parse(value);
                        console.log(`✅ ${key} is valid JSON.`);
                    } catch (e) {
                        console.error(`❌ ${key} is NOT valid JSON.`);
                        errors++;
                    }
                } else {
                    console.log(`✅ ${key} is set.`);
                }
            }
        } else {
            console.error(`❌ ${key} is MISSING from .env.`);
            missing++;
        }
    });

    console.log("\n--- Environment Health Report ---");
    console.log(`Missing Keys: ${missing}`);
    console.log(`Placeholder Keys: ${placeholders}`);
    console.log(`Format Errors: ${errors}`);
    
    if (missing === 0 && placeholders === 0 && errors === 0) {
        console.log("🚀 Everything looks ready for local development!");
    } else {
        console.log("❌ Please fix the issues above before running the app.");
    }

    console.log("\n💡 REMINDER: Ensure these same keys are added to your Vercel Dashboard (Settings > Environment Variables).");
}

checkEnv();
