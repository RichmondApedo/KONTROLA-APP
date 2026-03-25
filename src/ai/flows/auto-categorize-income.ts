'use server';
/**
 * @fileOverview An AI flow for automatically assigning a single category to an income source based on its description.
 */

import { ai, googleAI } from '@/ai/genkit';
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
  model: 'googleai/gemini-2.5-flash',
  prompt: `You are an expert at categorizing financial transactions.
Based on the following income description, provide the single most likely category.
You MUST respond with a valid JSON object only, in the format: {"category": "Chosen Category"}.
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
    const response = await prompt(input);
    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse JSON for income categorization:", response.text);
      // Fallback to a default category on parsing failure
      return { category: 'Other Income' };
    }
  }
);

export async function autoCategorizeIncome(input: AutoCategorizeInput): Promise<AutoCategorizeOutput> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === '<your_gemini_api_key>') {
      throw new Error("The Gemini API Key is not configured on the server. Please add it to the .env file to use AI features.");
  }
  return autoCategorizeIncomeFlow(input);
}
