'use server';
/**
 * @fileoverview Centralized Genkit initialization and configuration.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize the googleAI plugin. It will automatically look for the 
// GEMINI_API_KEY in your environment variables.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});
