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
import type { UserProfile, IncomeSource, Expense, SavingsGoal } from '@/lib/types';


const FinancialDataBaseSchema = z.object({
  incomeSources: z.custom<IncomeSource[]>(),
  expenses: z.custom<Expense[]>(),
  savingsGoals: z.custom<SavingsGoal[]>().optional(),
});

const FinancialInsightsInputSchema = z.object({
  userProfile: z.custom<UserProfile>(),
  personalData: FinancialDataBaseSchema,
  businessData: FinancialDataBaseSchema.optional(),
});
export type FinancialInsightsInput = z.infer<typeof FinancialInsightsInputSchema>;

const InsightSchema = z.object({
  title: z.string().describe("A short, catchy title for the observation."),
  description: z.string().describe("A detailed paragraph explaining the observation."),
  severity: z.enum(['positive', 'neutral', 'warning']).describe("The severity level of the insight."),
});

const FinancialInsightsOutputSchema = z.object({
  overallSummary: z.string().describe("A brief, one-sentence summary of the user's financial health (e.g., 'You're saving well, but transport costs are high.')."),
  savingsRate: z.object({
    rate: z.number().describe("The user's savings rate as a percentage (e.g., 15.5 for 15.5%). Can be negative if they are in debt."),
    analysis: z.string().describe("A brief analysis of their savings rate (e.g., 'This is a healthy savings rate!' or 'You spent more than you earned this period.').")
  }),
  keyObservations: z.array(InsightSchema).describe("An array of 2-4 key observations about spending habits, income trends, or budget adherence."),
  goalAnalysis: z.object({
      goalName: z.string().describe("The name of the most relevant savings goal being analyzed."),
      recommendation: z.string().describe("A specific, actionable recommendation connecting a spending cut to faster goal achievement. Example: 'If you reduce 'Food' spending by 20, you could reach your 'New Laptop' goal 2 months sooner!'")
  }).optional().describe("Analysis of a specific savings goal, if any exist."),
  businessInsights: z.object({
    profitMargin: z.object({
      margin: z.number().describe("The business's profit margin as a percentage. Can be negative."),
      analysis: z.string().describe("A brief analysis of the profit margin.")
    }),
    recommendation: z.string().describe("One key recommendation for the business based on its income and expenses.")
  }).optional().describe("Insights specific to business finances, if applicable.")
});
export type FinancialInsightsOutput = z.infer<typeof FinancialInsightsOutputSchema>;

// The main function that the client-side component will call
export async function getPersonalizedFinancialInsights(input: FinancialInsightsInput): Promise<FinancialInsightsOutput> {
  const promptInput = {
    userProfile: JSON.stringify(input.userProfile, null, 2),
    personalIncome: JSON.stringify(input.personalData.incomeSources, null, 2),
    personalExpenses: JSON.stringify(input.personalData.expenses, null, 2),
    personalSavingsGoals: input.personalData.savingsGoals ? JSON.stringify(input.personalData.savingsGoals, null, 2) : 'No savings goals set.',
    businessDataProvided: !!input.businessData,
    businessIncome: input.businessData ? JSON.stringify(input.businessData.incomeSources, null, 2) : '',
    businessExpenses: input.businessData ? JSON.stringify(input.businessData.expenses, null, 2) : '',
  };
  return personalizedFinancialInsightsFlow(promptInput);
}

const promptInputSchema = z.object({
  userProfile: z.string(),
  personalIncome: z.string(),
  personalExpenses: z.string(),
  personalSavingsGoals: z.string(),
  businessDataProvided: z.boolean(),
  businessIncome: z.string(),
  businessExpenses: z.string(),
});

const prompt = ai.definePrompt({
  name: 'personalizedFinancialInsightsPrompt',
  input: {schema: promptInputSchema},
  output: {schema: FinancialInsightsOutputSchema},
  prompt: `You are KONTROLA's advanced AI financial analyst. Your tone is expert, but clear and encouraging. You avoid jargon.
Your goal is to provide a structured analysis of the user's financial data.

Analyze the user's financial data. The user's profile is:
{{{userProfile}}}

**Personal Finance Data:**
- Personal Income (JSON): {{{personalIncome}}}
- Personal Expenses (JSON): {{{personalExpenses}}}
- Personal Savings Goals (JSON): {{{personalSavingsGoals}}}

{{#if businessDataProvided}}
**Business Finance Data:**
- Business Income (JSON): {{{businessIncome}}}
- Business Expenses (JSON): {{{businessExpenses}}}
{{/if}}

Based on the provided data, generate a structured JSON output. Adhere strictly to the output schema.

**Your Analysis MUST Include:**

1.  **overallSummary**: A concise, one-sentence summary of the user's financial situation.

2.  **savingsRate**:
    - Calculate the personal savings rate: \`((Total Personal Income - Total Personal Expenses) / Total Personal Income) * 100\`. Handle division by zero.
    - Provide a brief analysis of this rate. A rate above 20% is excellent, 10-20% is good, 0-10% is okay, and below 0% is a warning.

3.  **keyObservations**: Provide 2-4 key observations. For each, specify a title, description, and severity.
    - **Positive**: Highlight something they are doing well (e.g., high income source, low spending in a key category).
    - **Neutral**: Point out a significant financial fact (e.g., "Your largest expense category is Rent.").
    - **Warning**: Identify a potential problem area (e.g., "Your 'Dining Out' spending has increased by 30% this month.").

4.  **goalAnalysis**: If the user has savings goals:
    - Pick their most relevant or largest savings goal.
    - Find a specific, frequent expense category (like 'Food' or 'Transport').
    - Create a concrete, actionable recommendation that connects a small reduction in that spending category to achieving the goal faster.
    - **Example**: Find a trade-off. If they reduce 'Transport' spending by 50, calculate how many months faster they could reach their 'Vacation' goal and state it clearly.
    - If no goals exist, omit this field.

5.  **businessInsights**: If business data is provided:
    - Calculate the business profit margin: \`((Total Business Income - Total Business Expenses) / Total Business Income) * 100\`.
    - Provide a brief analysis of the margin.
    - Give one key, actionable recommendation for the business (e.g., "Focus on 'Service X' as it's your most profitable income source," or "Consider reducing spending on 'Marketing' as it's your highest business expense.").
    - If no business data is provided, omit this field.

Use the currency from the user's profile in your text descriptions.
`,
});

const personalizedFinancialInsightsFlow = ai.defineFlow(
  {
    name: 'personalizedFinancialInsightsFlow',
    inputSchema: promptInputSchema,
    outputSchema: FinancialInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
