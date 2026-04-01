import { ai, googleAI } from './src/ai/genkit';

async function listModels() {
  try {
    // This is a hacky way to see what models are registered in Genkit
    // @ts-ignore
    const registries = ai.registry;
    console.log("Registered Models:", JSON.stringify(Object.keys(registries.lookup('model') || {}), null, 2));
  } catch (e) {
    console.error("Error listing models:", e);
  }
}

listModels();
