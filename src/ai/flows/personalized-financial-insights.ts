'use server';

/**
 * @fileOverview AI-powered flow to provide personalized financial insights and recommendations based on user's financial data.
 *
 * - getPersonalizedFinancialInsights - A function that takes income and expense data to provide financial advice.
 * - FinancialInsightsInput - The input type for the getPersonalizedFinancialInsights function.
 * - FinancialInsightsOutput - The return type for the getPersonalizedFinancialInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialInsightsInputSchema = z.object({
  incomeData: z.string().describe('User income data, including sources and amounts.'),
  expenseData: z.string().describe('User expense data, including categories and amounts.'),
});
export type FinancialInsightsInput = z.infer<typeof FinancialInsightsInputSchema>;

const FinancialInsightsOutputSchema = z.object({
  insights: z.string().describe('Personalized financial insights and recommendations.'),
});
export type FinancialInsightsOutput = z.infer<typeof FinancialInsightsOutputSchema>;

export async function getPersonalizedFinancialInsights(input: FinancialInsightsInput): Promise<FinancialInsightsOutput> {
  return personalizedFinancialInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedFinancialInsightsPrompt',
  input: {schema: FinancialInsightsInputSchema},
  output: {schema: FinancialInsightsOutputSchema},
  prompt: `You are an AI financial advisor. Analyze the user's financial data (income and expenses) and provide personalized insights and recommendations for better financial management.

Income Data: {{{incomeData}}}
Expense Data: {{{expenseData}}}

Provide clear, actionable advice.
`,
});

const personalizedFinancialInsightsFlow = ai.defineFlow(
  {
    name: 'personalizedFinancialInsightsFlow',
    inputSchema: FinancialInsightsInputSchema,
    outputSchema: FinancialInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
