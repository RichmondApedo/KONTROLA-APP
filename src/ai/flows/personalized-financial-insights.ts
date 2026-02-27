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

const FinancialInsightsOutputSchema = z.object({
  insights: z.string().describe('Personalized financial insights and recommendations in a simple HTML format.'),
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
  prompt: `You are KONTROLA's AI financial advisor. Your tone is friendly, encouraging, and very easy to understand. You avoid jargon.
Your goal is to give simple, actionable advice in a single HTML string. Use only <p>, <ul>, <li>, and <strong> tags.

Analyze the user's financial data. The user's profile is:
{{{userProfile}}}

**Personal Finance Analysis:**
Your primary focus is on the user's personal finances.
- Personal Income (JSON): {{{personalIncome}}}
- Personal Expenses (JSON): {{{personalExpenses}}}
- Personal Savings Goals (JSON): {{{personalSavingsGoals}}}

Based on the personal data, your response MUST include:
1.  **A friendly greeting.** Address the user by their first name inside a <p> tag.
2.  **Top Spending Insight:** Identify their top 2-3 personal spending categories in an unordered list.
3.  **Actionable Trade-off:** Find a specific, frequent expense category (like 'Food' or 'Transport'). Suggest a small, realistic reduction in that category. Then, connect this saving to one of their actual savings goals, showing them how much faster they could achieve it.
    - **Example format**: "<p>I noticed you're working towards your '<strong>[Goal Name]</strong>' goal. Here's a thought: if you could reduce your 'Food' spending by just <strong>[CURRENCY] 20</strong> each week, you could add an extra <strong>[CURRENCY] 80</strong> to your savings each month and reach your goal for the new laptop almost <strong>2 months</strong> sooner!</p>"
    - **Crucially, make the calculation and be specific.** Use the currency from the user's profile.
4.  **One Quick Win:** Provide one other clear, actionable tip in a <p> tag. (e.g., "<p>Your income from '<strong>Freelance</strong>' is growing! Have you considered setting up an automatic transfer to your savings each time you get paid?</p>").

{{#if businessDataProvided}}
<hr>
<p><strong>Business Finance Analysis:</strong></p>
You also have some data on their business finances.
- Business Income (JSON): {{{businessIncome}}}
- Business Expenses (JSON): {{{businessExpenses}}}

Based on the business data, your response MUST include a <ul> with two <li> items:
1.  **Business Cash Flow Insight:** Briefly comment on the business's cash flow (is income higher than expenses?).
2.  **Business Optimization Tip:** Provide one concise suggestion for their business, like highlighting their most profitable income source or a high expense category to watch.
{{/if}}

Combine all of this into a single, cohesive HTML response.
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
