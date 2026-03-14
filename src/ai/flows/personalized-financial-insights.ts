'use server';
/**
 * @fileOverview An AI flow for generating personalized financial insights.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const UserProfileSchema = z.object({
  firstName: z.string().optional(),
  plan: z.string(),
  preferredCurrency: z.string(),
});

const IncomeExpenseSchema = z.object({
  amount: z.number(),
  category: z.string(),
  description: z.string().optional(),
  name: z.string().optional(),
  date: z.string(),
  context: z.enum(['personal', 'business']).optional(),
});

const FinancialDataInputSchema = z.object({
  profile: UserProfileSchema,
  income: z.array(IncomeExpenseSchema),
  expenses: z.array(IncomeExpenseSchema),
});

export type FinancialInsightsInput = z.infer<typeof FinancialDataInputSchema>;

export const FinancialInsightsOutputSchema = z.object({
  overallSummary: z.string().describe("A brief, friendly summary of the user's overall financial health this month."),
  savingsRate: z.object({
    rate: z.number().describe("The user's savings rate as a percentage (e.g., 15.5 for 15.5%)."),
    analysis: z.string().describe("A short analysis of the savings rate (e.g., 'This is a healthy savings rate!', 'There's room for improvement here.')."),
  }),
  keyObservations: z.array(z.object({
    title: z.string().describe("A short, catchy title for the observation."),
    description: z.string().describe("A one-sentence description of the observation (e.g., 'You spent a significant amount on dining out.')."),
    severity: z.enum(['positive', 'neutral', 'warning']).describe("The severity or tone of the observation."),
  })).describe("A list of 2-3 most important observations from the data."),
  actionableRecommendations: z.array(z.object({
    title: z.string(),
    description: z.string(),
    action: z.object({
      type: z.enum(['CREATE_BUDGET', 'SET_GOAL', 'INFO_ONLY']),
      details: z.record(z.any()).optional(),
    }),
  })).describe("A list of 1-2 highly relevant, actionable recommendations for the user."),
  businessInsights: z.object({
    profitMargin: z.object({
      margin: z.number(),
      analysis: z.string(),
    }),
    recommendation: z.string(),
  }).optional().describe("Insights specific to business finances, if applicable."),
});
export type FinancialInsightsOutput = z.infer<typeof FinancialInsightsOutputSchema>;

const prompt = ai.definePrompt({
  name: 'financialInsightsPrompt',
  input: { schema: FinancialDataInputSchema },
  output: { schema: FinancialInsightsOutputSchema },
  prompt: `You are an expert, friendly financial advisor named KONTROLA. Your task is to analyze the user's monthly financial data and provide personalized, actionable insights in a structured format.

Analyze the provided income and expenses for {{{profile.firstName}}}. The user's currency is {{{profile.preferredCurrency}}}.

1.  **Overall Summary**: Write a brief, encouraging summary of their financial month.
2.  **Savings Rate**: Calculate the savings rate ((Total Income - Total Expenses) / Total Income) * 100. Provide the percentage and a brief analysis (e.g., "healthy", "room for improvement"). If income is zero, the rate is zero.
3.  **Key Observations**: Identify the 2-3 most significant positive, neutral, or warning observations (e.g., high spending in one category, consistent income).
4.  **Actionable Recommendations**: Based on the data, provide 1-2 concrete recommendations. This could be to create a budget for a high-spending category or to set a savings goal.
5.  **Business Insights**: If there are clear business-related income/expenses (where context is 'business'), calculate the profit margin for the business transactions and provide a recommendation. Otherwise, omit this section.

Here is the user's data for the month:
---
**Income:**
{{#each income}}
- {{name}}: {{amount}} on {{date}} (Context: {{#if context}}{{context}}{{else}}personal{{/if}})
{{else}}
- No income data provided.
{{/each}}

**Expenses:**
{{#each expenses}}
- {{description}} ({{category}}): {{amount}} on {{date}} (Context: {{#if context}}{{context}}{{else}}personal{{/if}})
{{else}}
- No expense data provided.
{{/each}}
---
Generate the structured financial insights based on this data.
`,
});

const getPersonalizedFinancialInsightsFlow = ai.defineFlow(
  {
    name: 'getPersonalizedFinancialInsightsFlow',
    inputSchema: FinancialDataInputSchema,
    outputSchema: FinancialInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The AI model did not return a valid response.');
    }
    return output;
  }
);

export async function getPersonalizedFinancialInsights(input: FinancialInsightsInput): Promise<FinancialInsightsOutput> {
  return getPersonalizedFinancialInsightsFlow(input);
}
