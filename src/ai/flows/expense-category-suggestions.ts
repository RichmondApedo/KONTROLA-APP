'use server';
/**
 * @fileOverview An AI flow for suggesting expense categories based on a description.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';

const SuggestionInputSchema = z.object({
  description: z.string().describe('The user-provided description of an expense.'),
});
export type SuggestionInput = z.infer<typeof SuggestionInputSchema>;

const SuggestionOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of 3-5 relevant expense categories, from most to least likely.'),
});
export type SuggestionOutput = z.infer<typeof SuggestionOutputSchema>;

const prompt = ai.definePrompt({
  name: 'expenseCategoryPrompt',
  model: googleAI.model('gemini-1.0-pro'),
  input: { schema: SuggestionInputSchema },
  prompt: `You are an expert at categorizing financial transactions.
Based on the following expense description, suggest 3 to 5 likely categories.
Order them from the most probable to the least probable.
Use common, simple category names like "Food", "Transport", "Shopping", "Entertainment", "Utilities", "Health", "Rent", "Education", "Travel", "Business".

IMPORTANT: Your response MUST be a single, valid JSON object. Do not include any text, notes, or explanations before or after the JSON. The JSON object must have a single key "suggestions", which is an array of strings. For example: {"suggestions": ["Food", "Shopping", "Entertainment"]}.

Expense Description: "{{{description}}}"`,
});

const expenseCategorySuggestionFlow = ai.defineFlow(
  {
    name: 'expenseCategorySuggestionFlow',
    inputSchema: SuggestionInputSchema,
    outputSchema: SuggestionOutputSchema,
  },
  async (input) => {
    const response = await prompt(input);
    let text = response.text;
    
    // Clean up markdown fences
    const match = text.match(/```json\n([\s\S]+?)\n```/);
    if (match) {
        text = match[1];
    }

    try {
        const parsedJson = JSON.parse(text);
        return SuggestionOutputSchema.parse(parsedJson);
    } catch (e) {
        console.error("Failed to parse category suggestions response as JSON:", text, e);
        throw new Error("The AI returned an unexpected format for suggestions. Please try again.");
    }
  }
);

export async function suggestExpenseCategories(input: SuggestionInput): Promise<SuggestionOutput> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === '<your_gemini_api_key>') {
      throw new Error("The Gemini API Key is not configured on the server. Please add it to the .env file to use AI features.");
  }
  return expenseCategorySuggestionFlow(input);
}
