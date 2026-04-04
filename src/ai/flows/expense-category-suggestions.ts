'use server';
/**
 * @fileOverview An AI flow for suggesting expense categories based on a description.
 */

import { ai, googleAI, extractJsonFromText } from '@/ai/genkit';
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
  model: 'googleai/gemini-flash-latest',
  output: {
    format: 'json',
    schema: SuggestionOutputSchema,
  },
  prompt: `You are an expert at categorizing financial transactions.
Based on the following expense description, suggest 3 to 5 likely categories.
Order them from the most probable to the least probable.
Use common, simple category names like "Food", "Transport", "Shopping", "Entertainment", "Utilities", "Health", "Rent", "Education", "Travel", "Business".

Expense Description: "{{{description}}}"
`,
});

const expenseCategorySuggestionFlow = ai.defineFlow(
  {
    name: 'expenseCategorySuggestionFlow',
    inputSchema: SuggestionInputSchema,
    outputSchema: SuggestionOutputSchema,
  },
  async (input) => {
    try {
      const response = await prompt(input);
      if (!response.output) {
        throw new Error("No structured output returned from model.");
      }
      return response.output;
    } catch (e: any) {
      console.error("Failed to generate expense suggestions:", e.message || e);
      return { suggestions: [] };
    }
  }
);

export async function suggestExpenseCategories(input: SuggestionInput): Promise<SuggestionOutput> {
  return expenseCategorySuggestionFlow(input);
}
