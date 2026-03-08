/**
 * @fileOverview Centralized constants for AI model names used in the application.
 * This prevents typos and makes it easy to update models in one place.
 */

import { googleAI } from '@genkit-ai/google-genai';

/**
 * A collection of model names used throughout the application.
 * Using googleAI.model() ensures the correct format is always used.
 */
export const MODELS = {
  /** The primary model for text generation, chat, and analysis. */
  TEXT: googleAI.model('gemini-1.5-flash-latest'),
};
