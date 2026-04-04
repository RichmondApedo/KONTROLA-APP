/**
 * @fileoverview Centralized Genkit initialization and configuration.
 */
import { genkit } from 'genkit';
import { googleAI as googleAIPlugin } from '@genkit-ai/google-genai';
import { extractJsonFromText as extractJson } from './utils';

// Initialize the googleAI plugin, explicitly passing the API key
// from environment variables.
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === 'your_gemini_api_key') {
    console.warn("⚠️ [Genkit] GEMINI_API_KEY is not defined or is still the placeholder. AI flow execution will fail.");
} else {
    console.log("✅ [Genkit] GEMINI_API_KEY is configured.");
}

export const googleAI = googleAIPlugin({
  apiKey: apiKey || 'dummy-key-for-ssr-safety',
});

// Configure Genkit with the initialized plugin.
export const ai = genkit({
  plugins: [googleAI],
});

export const extractJsonFromText = extractJson;

