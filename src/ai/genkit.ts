'use server';
/**
 * @fileoverview Centralized Genkit initialization and configuration.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize the googleAI plugin with the Gemini Pro model.
// We explicitly pass the API key to ensure it's read correctly by the server.
export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
  ],
  // logLevel and enableTracingAndMetrics are not valid options here in Genkit 1.x
  // and were causing the Google AI plugin to fail to initialize correctly.
});
