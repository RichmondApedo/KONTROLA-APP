'use server';

/**
 * @fileOverview Provides expense category suggestions based on the expense description.
 *
 * - suggestExpenseCategories - A function that suggests expense categories.
 * - SuggestExpenseCategoriesInput - The input type for the suggestExpenseCategories function.
 * - SuggestExpenseCategoriesOutput - The return type for the suggestExpenseCategories function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestExpenseCategoriesInputSchema = z.object({
  expenseDescription: z
    .string()
    .describe('The description of the expense for which to suggest categories.'),
});
export type SuggestExpenseCategoriesInput = z.infer<
  typeof SuggestExpenseCategoriesInputSchema
>;

const SuggestExpenseCategoriesOutputSchema = z.object({
  suggestedCategories: z
    .array(z.string())
    .describe('An array of suggested expense categories.'),
});
export type SuggestExpenseCategoriesOutput = z.infer<
  typeof SuggestExpenseCategoriesOutputSchema
>;

export async function suggestExpenseCategories(
  input: SuggestExpenseCategoriesInput
): Promise<SuggestExpenseCategoriesOutput> {
  return suggestExpenseCategoriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestExpenseCategoriesPrompt',
  input: {schema: SuggestExpenseCategoriesInputSchema},
  output: {schema: SuggestExpenseCategoriesOutputSchema},
  prompt: `Based on the following expense description, suggest relevant expense categories. Return the categories as a JSON array of strings.

Expense Description: {{{expenseDescription}}}

Categories:`,
});

const suggestExpenseCategoriesFlow = ai.defineFlow(
  {
    name: 'suggestExpenseCategoriesFlow',
    inputSchema: SuggestExpenseCategoriesInputSchema,
    outputSchema: SuggestExpenseCategoriesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
