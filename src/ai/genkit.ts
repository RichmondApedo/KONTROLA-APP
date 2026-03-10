import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * @fileoverview This file contains the core Genkit configuration.
 *
 * It is configured to use the Gemini API key from the `GEMINI_API_KEY`
 * environment variable.
 *
 * To get your key, visit https://aistudio.google.com/ and click "Get API key".
 * You must set this key as an environment variable for the application to work.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      // Genkit will automatically look for the GEMINI_API_KEY environment variable.
      apiVersion: 'v1beta',
    }),
  ],
});
