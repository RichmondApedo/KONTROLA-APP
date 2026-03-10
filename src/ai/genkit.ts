/**
 * @fileoverview This file contains the core Genkit configuration.
 *
 * It is configured to use the Gemini API key from the `GEMINI_API_KEY`
 * environment variable.
 *
 * To get your key, visit https://aistudio.google.com/ and click "Get API key".
 * You must set this key as an environment variable for the application to work.
 */

// All Genkit dependencies have been temporarily removed to resolve build issues.
// This mock object prevents the application from crashing.
// AI features will be disabled until dependencies are restored.
export const ai = {
  defineFlow: (config: any, implementation: any) => implementation,
  definePrompt: (config: any) => (input: any) => Promise.resolve({ output: null }),
  defineTool: (config: any, implementation: any) => implementation,
  genkit: (config: any) => {},
};
