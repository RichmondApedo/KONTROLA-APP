/**
 * @fileoverview Centralized Genkit initialization and configuration.
 */
import { genkit } from 'genkit';
import { googleAI as googleAIPlugin } from '@genkit-ai/google-genai';

// Initialize the googleAI plugin, explicitly passing the API key
// from environment variables.
export const googleAI = googleAIPlugin({
  apiKey: process.env.GEMINI_API_KEY,
  apiVersion: 'v1beta',
});

// Configure Genkit with the initialized plugin.
// This `ai` object is the main interface for defining flows, prompts, etc.
export const ai = genkit({
  plugins: [googleAI],
});
