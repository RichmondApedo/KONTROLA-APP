/**
 * @fileoverview Centralized Genkit initialization and configuration.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Define the model centrally using the static method on the plugin.
// We are using 'gemini-pro' as it is the standard, most compatible model.
export const geminiPro = googleAI.model('gemini-pro');

// Initialize the googleAI plugin, explicitly passing the API key
// from environment variables. We are NOT specifying an apiVersion, allowing
// the library to use the default, which is typically the most compatible.
export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});
