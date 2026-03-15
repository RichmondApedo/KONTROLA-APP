/**
 * @fileoverview Centralized Genkit initialization and configuration.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Define the model centrally using the static method on the plugin.
// We are using 'gemini-pro' as it is the most standard and stable model.
export const geminiPro = googleAI.model('gemini-pro');

// Initialize the googleAI plugin, explicitly passing the API key
// from environment variables. Let Genkit use the default API version.
export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});
