'use server';
/**
 * @fileoverview Centralized Genkit initialization and configuration.
 */

import { genkit, firebase } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/google-genai';
import 'dotenv/config';

// Initialize the googleAI plugin with the Gemini Pro model.
// Genkit will look for the GEMINI_API_KEY environment variable.
export const ai = genkit({
  plugins: [
    googleAI(),
    firebase(),
  ],
  logLevel: "warn", // Use 'warn' or 'error' for production
  enableTracingAndMetrics: false, // Set to false for production unless using App Hosting tracing
});
