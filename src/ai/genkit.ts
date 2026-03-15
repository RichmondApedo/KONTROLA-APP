/**
 * @fileoverview Centralized Genkit initialization and configuration.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Define the model centrally.
// We are trying 'gemini-1.5-flash-latest' as it's a standard and recent model.
export const geminiPro = 'gemini-1.5-flash-latest';

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
