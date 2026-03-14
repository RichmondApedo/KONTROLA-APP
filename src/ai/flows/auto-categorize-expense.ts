'use server';
/**
 * @fileOverview An AI flow for automatically assigning a single category to an expense based on its description.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AutoCategorizeInputSchema = z.object({
  description: z.string().describe('The user-provided description of an expense or transaction narration.'),
});
export type AutoCategorizeInput = z.infer<typeof AutoCategorizeInputSchema>;

const AutoCategorizeOutputSchema = z.object({
  category: z.string().describe('The single most likely category for the transaction.'),
});
export type AutoCategorizeOutput = z.infer<typeof AutoCategorizeOutputSchema>;

const commonExpenseCategories = [
    'Rent', 'Food', 'Water Bills', 'ECG Bills', 'Health', 'Transport',
    'Household', 'Shopping', 'Entertainment', 'Church Contributions',
    'Funeral Donations', 'Education', 'Travel', 'Business', 'Other'
].join('", "');

const prompt = ai.definePrompt({
  name: 'autoCategorizeExpensePrompt',
  input: { schema: AutoCategorizeInputSchema },
  output: { schema: AutoCategorizeOutputSchema },
  prompt: `You are an expert at categorizing financial transactions.
Based on the following expense description, provide the single most likely category.
Choose from this list of common categories: "${commonExpenseCategories}".
If the description is vague or doesn't fit well, use "Other".

Expense Description: "{{{description}}}"`,
});

const autoCategorizeExpenseFlow = ai.defineFlow(
  {
    name: 'autoCategorizeExpenseFlow',
    inputSchema: AutoCategorizeInputSchema,
    outputSchema: AutoCategorizeOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The AI model did not return a valid category.');
    }
    return output;
  }
);

export async function autoCategorizeExpense(input: AutoCategorizeInput): Promise<AutoCategorizeOutput> {
  return autoCategorizeExpenseFlow(input);
}
