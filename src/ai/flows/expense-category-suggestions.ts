'use server';
/**
 * @fileOverview An AI flow for suggesting expense categories based on a description.
 */

import { ai } from '@/ai/genkit';
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
  model: 'googleai/gemini-1.5-flash',
  output: { schema: SuggestionOutputSchema },
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
    const response = await prompt(input);
    return response.output!;
  }
);

export async function suggestExpenseCategories(input: SuggestionInput): Promise<SuggestionOutput> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === '<your_gemini_api_key>') {
      throw new Error("The Gemini API Key is not configured on the server. Please add it to the .env file to use AI features.");
  }
  return expenseCategorySuggestionFlow(input);
}
