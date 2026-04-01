/**
 * @fileoverview Centralized Genkit initialization and configuration.
 */
import { genkit } from 'genkit';
import { googleAI as googleAIPlugin } from '@genkit-ai/google-genai';

// Initialize the googleAI plugin, explicitly passing the API key
// from environment variables.
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("⚠️ [Genkit] GEMINI_API_KEY is not defined in environment variables. Flow execution may fail.");
}

export const googleAI = googleAIPlugin({
  apiKey: apiKey || 'dummy-key-for-ssr-safety',
});

// Configure Genkit with the initialized plugin.
// This `ai` object is the main interface for defining flows, prompts, etc.
export const ai = genkit({
  plugins: [googleAI],
});

/**
 * Robustly extracts a JSON object or array from a markdown-formatted AI response.
 */
export function extractJsonFromText(text: string): string {
  let rawText = text.trim();
  
  // Strip markdown code fences if present
  const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match && match[1]) {
    rawText = match[1].trim();
  }
  
  // Isolate the outermost JSON object or array
  const startObj = rawText.indexOf('{');
  const startArr = rawText.indexOf('[');
  
  let start = -1;
  if (startObj !== -1 && startArr !== -1) {
    start = Math.min(startObj, startArr);
  } else if (startObj !== -1) {
    start = startObj;
  } else {
    start = startArr;
  }
  
  if (start !== -1) {
    const isObj = rawText[start] === '{';
    const endChar = isObj ? '}' : ']';
    const end = rawText.lastIndexOf(endChar);
    
    if (end !== -1 && end >= start) {
      return rawText.substring(start, end + 1);
    }
  }
  
  return rawText;
}
