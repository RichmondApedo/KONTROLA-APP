import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import { GEMINI_API_KEY } from './config';

export const ai = genkit({
  plugins: [
    googleAI({
      // Use the key from the config file if it has been changed from the placeholder.
      // Otherwise, let Genkit try to find it in the environment variables (e.g., process.env.GEMINI_API_KEY).
      apiKey: GEMINI_API_KEY === 'your_api_key_here' ? undefined : GEMINI_API_KEY,
    }),
  ],
});
