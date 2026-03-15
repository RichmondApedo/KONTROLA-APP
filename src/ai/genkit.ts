/**
 * @fileoverview Centralized Genkit initialization and configuration.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize the googleAI plugin, explicitly passing the API key
// from environment variables and forcing the stable 'v1' API to prevent errors.
export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      apiVersion: 'v1',
    }),
  ],
});
