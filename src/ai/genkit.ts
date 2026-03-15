/**
 * @fileoverview Centralized Genkit initialization and configuration.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Define the model centrally using the static method on the plugin.
// We are using 'gemini-1.0-pro' as it is the standard model for the v1 API.
export const geminiPro = googleAI.model('gemini-1.0-pro');

// Initialize the googleAI plugin, explicitly passing the API key
// from environment variables and forcing the stable 'v1' API.
export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      apiVersion: 'v1',
    }),
  ],
});
