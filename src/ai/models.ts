/**
 * @fileOverview Centralized constants for AI model names used in the application.
 * This prevents typos and makes it easy to update models in one place.
 */

/**
 * A collection of model name strings used throughout the application.
 * Providing the full 'provider/model' string directly to Genkit.
 */
export const MODELS = {
  /** The primary model for text generation, chat, and analysis. */
  TEXT: 'googleai/gemini-pro',
};
