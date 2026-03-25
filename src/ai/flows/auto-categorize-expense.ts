'use server';
/**
 * @fileOverview An AI flow for automatically assigning a single category to an expense based on its description.
 */

import { ai, googleAI } from '@/ai/genkit';
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
  model: 'googleai/gemini-2.5-flash',
  prompt: `You are an expert at categorizing financial transactions.
Based on the following expense description, provide the single most likely category.
You MUST respond with a valid JSON object only, in the format: {"category": "Chosen Category"}.
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
    const response = await prompt(input);
    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse JSON for expense categorization:", response.text);
      // Fallback to a default category on parsing failure
      return { category: 'Other' };
    }
  }
);

export async function autoCategorizeExpense(input: AutoCategorizeInput): Promise<AutoCategorizeOutput> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === '<your_gemini_api_key>') {
      throw new Error("The Gemini API Key is not configured on the server. Please add it to the .env file to use AI features.");
  }
  return autoCategorizeExpenseFlow(input);
}
