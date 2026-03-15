'use server';
/**
 * @fileOverview An AI flow for suggesting expense categories based on a description.
 */

import { ai, geminiPro } from '@/ai/genkit';
import { z } from 'zod';
import { json } from 'stream/consumers';

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
  model: geminiPro,
  prompt: `You are an expert at categorizing financial transactions.
Based on the following expense description, suggest 3 to 5 likely categories.
Order them from the most probable to the least probable.
Use common, simple category names like "Food", "Transport", "Shopping", "Entertainment", "Utilities", "Health", "Rent", "Education", "Travel", "Business".

Expense Description: "{{{description}}}"

IMPORTANT: Your entire response must be a single, valid JSON object that conforms to the following Zod schema. Do not include any text, conversation, or markdown formatting (like \`\`\`json) before or after the JSON object. Your response should be directly parsable by JSON.parse().

Schema:
${JSON.stringify(SuggestionOutputSchema.jsonSchema())}
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
    const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
        return JSON.parse(cleanedText);
    } catch (e: any) {
        console.error("Failed to parse AI JSON response for category suggestions:", cleanedText, e);
        throw new Error("The AI returned an invalid response format that could not be understood.");
    }
  }
);

export async function suggestExpenseCategories(input: SuggestionInput): Promise<SuggestionOutput> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === '<your_gemini_api_key>') {
      throw new Error("The Gemini API Key is not configured on the server. Please add it to the .env file to use AI features.");
  }
  return expenseCategorySuggestionFlow(input);
}
