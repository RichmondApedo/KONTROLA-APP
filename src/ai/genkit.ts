/**
 * @fileoverview Centralized Genkit initialization and configuration.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize the googleAI plugin, explicitly passing the API key
// from environment variables to ensure a reliable connection.
// We are also specifying apiVersion: 'v1' to ensure we use the stable
// API endpoint, resolving issues with model availability on beta endpoints.
export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: 'v1' }),
  ],
});
