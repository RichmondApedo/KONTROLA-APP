import { ai, googleAI } from './src/ai/genkit';

async function listModels() {
  try {
    // This is a way to see what models are registered in Genkit v1.x
    // @ts-ignore
    const registries = ai.registry;
    // Use the list() method if available, or inspect the registry structure
    const registryItems = typeof registries.list === 'function' ? registries.list() : [];
    console.log("Registered Models:", JSON.stringify(registryItems.filter(i => i.type === 'model').map(i => i.name), null, 2));
  } catch (e) {
    console.error("Error listing models:", e);
  }
}

listModels();
