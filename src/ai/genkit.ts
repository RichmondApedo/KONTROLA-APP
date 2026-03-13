'use server';
/**
 * @fileoverview Centralized Genkit initialization and configuration.
 */

import { genkit, firebase } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize the googleAI plugin with the Gemini Pro model.
// We explicitly pass the API key to ensure it's read correctly by the server.
export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
    firebase(),
  ],
  logLevel: "warn", // Use 'warn' or 'error' for production
  enableTracingAndMetrics: false, // Set to false for production unless using App Hosting tracing
});
