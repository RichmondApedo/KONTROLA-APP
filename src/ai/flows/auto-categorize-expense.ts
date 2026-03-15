'use server';
/**
 * @fileOverview An AI flow for automatically assigning a single category to an expense based on its description.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
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
  model: googleAI.model('gemini-1.0-pro'),
  input: { schema: AutoCategorizeInputSchema },
  prompt: `You are an expert at categorizing financial transactions.
Based on the following expense description, provide the single most likely category.
Choose from this list of common categories: "${commonExpenseCategories}".
If the description is vague or doesn't fit well, use "Other".

Respond with ONLY a valid JSON object in the format: {"category": "your_category_here"}

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
    let text = response.text;
    
    // Clean up markdown fences
    const match = text.match(/```json\n([\s\S]+?)\n```/);
    if (match) {
        text = match[1];
    }

    try {
        const parsedJson = JSON.parse(text);
        return AutoCategorizeOutputSchema.parse(parsedJson);
    } catch (e) {
        console.error("Failed to parse auto-categorize-expense response as JSON:", text, e);
        throw new Error("The AI returned an unexpected format for category.");
    }
  }
);

export async function autoCategorizeExpense(input: AutoCategorizeInput): Promise<AutoCategorizeOutput> {
  return autoCategorizeExpenseFlow(input);
}
