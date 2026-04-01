const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        let value = valueParts.join('=').trim();
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        envVars[key.trim()] = value;
    }
});

const apiKey = envVars['GEMINI_API_KEY'];
if (!apiKey || apiKey.includes('your_')) {
    console.error("❌ GEMINI_API_KEY is missing or a placeholder.");
    process.exit(1);
}

// Minimal check using fetch to avoid dependencies
async function testGemini() {
    console.log("🔍 Testing Gemini 2.0 API connectivity...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    
    const payload = {
        contents: [{ parts: [{ text: "Say hello" }] }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (response.ok) {
            console.log("✅ Gemini API is WORKING! Response:", data.candidates[0].content.parts[0].text);
        } else {
            console.error("❌ Gemini API returned an error:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("❌ Network error testing Gemini:", e.message);
    }
}

testGemini();
