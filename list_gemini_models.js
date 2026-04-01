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

async function listModels() {
    console.log("🔍 Fetching available models for your API key...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (response.ok) {
            console.log("✅ Models found:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.error("❌ API Error:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("❌ Network error:", e.message);
    }
}

listModels();
