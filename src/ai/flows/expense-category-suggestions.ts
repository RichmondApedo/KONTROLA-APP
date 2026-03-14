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
  model: 'googleai/gemini-pro',
  input: { schema: SuggestionInputSchema },
  output: { schema: SuggestionOutputSchema },
  prompt: `You are an expert at categorizing financial transactions.
Based on the following expense description, suggest 3 to 5 likely categories.
Order them from the most probable to the least probable.
Use common, simple category names like "Food", "Transport", "Shopping", "Entertainment", "Utilities", "Health", "Rent", "Education", "Travel", "Business".

Expense Description: "{{{description}}}"`,
});

const expenseCategorySuggestionFlow = ai.defineFlow(
  {
    name: 'expenseCategorySuggestionFlow',
    inputSchema: SuggestionInputSchema,
    outputSchema: SuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The AI model did not return a valid response.');
    }
    return output;
  }
);

export async function suggestExpenseCategories(input: SuggestionInput): Promise<SuggestionOutput> {
  return expenseCategorySuggestionFlow(input);
}
