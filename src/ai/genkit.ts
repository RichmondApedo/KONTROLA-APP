/**
 * @fileoverview Centralized Genkit initialization and configuration.
 */
import { genkit } from 'genkit';
import { googleAI as googleAIPlugin } from '@genkit-ai/google-genai';
import { extractJsonFromText as extractJson } from './utils';

// Initialize the googleAI plugin, explicitly passing the API key
// from environment variables.
const apiKey = process.env.GEMINI_API_KEY || "";

if (!apiKey || apiKey === 'your_gemini_api_key' || apiKey === '<your_gemini_api_key>') {
    console.error("❌ [Genkit] FATAL: GEMINI_API_KEY is missing! AI flows will fail. Please set this in your environment or .env file.");
} else {
    console.log("✅ [Genkit] GEMINI_API_KEY detected.");
}

export const googleAI = googleAIPlugin({
  apiKey: apiKey,
});

// Configure Genkit with the initialized plugin.
export const ai = genkit({
  plugins: [googleAI],
});

export const extractJsonFromText = extractJson;

