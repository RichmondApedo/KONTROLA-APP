const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
env.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        let value = valueParts.join('=').trim();
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        process.env[key.trim()] = value;
    }
});
const { askKontrolaFlow } = require('./src/ai/flows/ask-kontrola-flow');



const input = {
    question: 'How do I add an expense?',
    currentDate: 'April 1, 2026',
    profile: {
        firstName: 'Test User',
        plan: 'pro-plus',
        preferredCurrency: 'USD',
    },
    userId: 'test-user-id',
};

async function test() {
    console.log("🚀 Starting AI Flow Test...");
    try {
        const result = await askKontrolaFlow(input);
        console.log("✅ AI Flow Success! Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("❌ AI Flow FAILED with the following error:");
        console.error(error.stack || error.message || error);
    }
}

test();
