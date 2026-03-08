/**
 * @fileOverview Centralized constants for AI model names used in the application.
 * This prevents typos and makes it easy to update models in one place.
 */
import { googleAI } from '@genkit-ai/google-genai';

/**
 * A collection of model objects used throughout the application.
 * Using the `googleAI.model()` helper ensures the correct model reference is created.
 */
export const MODELS = {
  /** The primary model for text generation, chat, and analysis. */
  TEXT: googleAI.model('gemini-pro'),
};
