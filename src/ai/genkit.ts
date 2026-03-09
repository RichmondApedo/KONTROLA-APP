import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * @fileoverview This file contains the core Genkit configuration.
 *
 * IMPORTANT: PASTE YOUR GEMINI API KEY HERE.
 *
 * To get your key, visit https://aistudio.google.com/ and click "Get API key".
 * Find the line `const GEMINI_API_KEY = 'your_api_key_here';` below and
 * replace 'your_api_key_here' with your actual key.
 *
 * This is the only file you need to edit to configure your API key.
 */
const GEMINI_API_KEY = 'your_api_key_here';


export const ai = genkit({
  plugins: [
    googleAI({
      // Use the key from the constant above if it has been changed from the placeholder.
      // If it's still the placeholder, Genkit will try to find it in the environment variables.
      apiKey: GEMINI_API_KEY === 'your_api_key_here' ? undefined : GEMINI_API_KEY,
    }),
  ],
});
