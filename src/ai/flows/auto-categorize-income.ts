'use server';
/**
 * @fileOverview An AI flow for automatically assigning a single category to an income source based on its description.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';

const AutoCategorizeInputSchema = z.object({
  description: z.string().describe('The user-provided description of an income source or transaction narration.'),
});
export type AutoCategorizeInput = z.infer<typeof AutoCategorizeInputSchema>;

const AutoCategorizeOutputSchema = z.object({
  category: z.string().describe('The single most likely category for the transaction.'),
});
export type AutoCategorizeOutput = z.infer<typeof AutoCategorizeOutputSchema>;

const commonIncomeCategories = [
    'Salary', 'Investment', 'Freelance', 'Business Revenue',
    'Gift', 'Rental Income', 'Other Income'
].join('", "');


const prompt = ai.definePrompt({
  name: 'autoCategorizeIncomePrompt',
  model: googleAI.model('gemini-pro'),
  input: { schema: AutoCategorizeInputSchema },
  output: { schema: AutoCategorizeOutputSchema },
  prompt: `You are an expert at categorizing financial transactions.
Based on the following income description, provide the single most likely category.
Choose from this list of common categories: "${commonIncomeCategories}".
If the description is vague or doesn't fit well, use "Other Income".

Income Description: "{{{description}}}"`,
});

const autoCategorizeIncomeFlow = ai.defineFlow(
  {
    name: 'autoCategorizeIncomeFlow',
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

export async function autoCategorizeIncome(input: AutoCategorizeInput): Promise<AutoCategorizeOutput> {
  return autoCategorizeIncomeFlow(input);
}
