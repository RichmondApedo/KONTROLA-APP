const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.error("❌ .env file not found.");
    process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf-8');

// Regex to find the FIREBASE_SERVICE_ACCOUNT line
const saRegex = /^FIREBASE_SERVICE_ACCOUNT=(['"]?)(.+?)\1\s*$/m;
const match = envContent.match(saRegex);

if (match) {
    let saValue = match[2];
    try {
        // Try to parse it to see if it's already valid
        JSON.parse(saValue);
        console.log("✅ FIREBASE_SERVICE_ACCOUNT is already valid JSON.");
    } catch (e) {
        console.log("⚠️ FIREBASE_SERVICE_ACCOUNT is invalid JSON. Attempting to repair...");
        try {
            // Remove literal newlines if they exist within the string
            let cleaned = saValue.replace(/\r?\n/g, '\\n');
            // Ensure internal quotes are handled if it was wrapped in single quotes but contains double quotes
            // Actually, just try to parse the cleaned version
            const parsed = JSON.parse(cleaned);
            const perfected = JSON.stringify(parsed);
            
            // Replace the old line with the perfected one
            const newLine = `FIREBASE_SERVICE_ACCOUNT='${perfected}'`;
            envContent = envContent.replace(saRegex, newLine);
            fs.writeFileSync(envPath, envContent);
            console.log("✅ FIREBASE_SERVICE_ACCOUNT has been repaired and saved to .env.");
        } catch (e2) {
            console.error("❌ Failed to repair JSON automatically:", e2.message);
        }
    }
} else {
    console.error("❌ FIREBASE_SERVICE_ACCOUNT not found in .env.");
}
