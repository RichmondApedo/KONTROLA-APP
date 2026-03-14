/**
 * @fileoverview Centralized Genkit initialization and configuration.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize the googleAI plugin, explicitly passing the API key
// from environment variables to ensure a reliable connection.
export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
  ],
});
