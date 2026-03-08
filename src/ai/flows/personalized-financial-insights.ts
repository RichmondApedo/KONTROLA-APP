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
import type { UserProfile, IncomeSource, Expense, SavingsGoal, Budget } from '@/lib/types';


const FinancialDataBaseSchema = z.object({
  incomeSources: z.custom<IncomeSource[]>(),
  expenses: z.custom<Expense[]>(),
  savingsGoals: z.custom<SavingsGoal[]>().optional(),
  budgets: z.custom<Budget[]>().optional(),
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

// Schemas for structured, actionable recommendations
const CreateBudgetActionSchema = z.object({
  type: z.enum(['CREATE_BUDGET']),
  category: z.string().describe("The expense category for the suggested budget."),
  amount: z.number().describe("The suggested monthly budget amount, rounded to a sensible whole number."),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
});

const CreateSavingsGoalActionSchema = z.object({
    type: z.enum(['CREATE_SAVINGS_GOAL']),
    name: z.string().describe("A suggested, motivating name for the new savings goal."),
    targetAmount: z.number().describe("A suggested target amount for the goal, based on surplus income."),
});

const InfoOnlyActionSchema = z.object({
    type: z.enum(['INFO_ONLY']),
});

const ActionableRecommendationSchema = z.object({
    title: z.string().describe("A short, engaging title for the recommendation (e.g., 'Control Your Food Spending')."),
    description: z.string().describe("The detailed textual advice for the user, explaining the 'why' behind the recommendation."),
    action: z.union([
        CreateBudgetActionSchema,
        CreateSavingsGoalActionSchema,
        InfoOnlyActionSchema,
    ]).describe("The specific, structured action the user can take with one click."),
});


const FinancialInsightsOutputSchema = z.object({
  overallSummary: z.string().describe("A brief, one-sentence summary of the user's financial health (e.g., 'You're saving well, but transport costs are high.')."),
  savingsRate: z.object({
    rate: z.number().describe("The user's savings rate as a percentage (e.g., 15.5 for 15.5%). Can be negative if they are in debt."),
    analysis: z.string().describe("A brief analysis of their savings rate (e.g., 'This is a healthy savings rate!' or 'You spent more than you earned this period.').")
  }),
  keyObservations: z.array(InsightSchema).describe("An array of 2-3 key observations about spending habits, income trends, or budget adherence."),
  actionableRecommendations: z.array(ActionableRecommendationSchema).describe("A list of 1-2 concrete, actionable recommendations. Each recommendation includes a description and a structured action the user can take."),
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
    personalBudgets: input.personalData.budgets ? JSON.stringify(input.personalData.budgets, null, 2) : 'No budgets set.',
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
  personalBudgets: z.string(),
  businessDataProvided: z.boolean(),
  businessIncome: z.string(),
  businessExpenses: z.string(),
});

const prompt = ai.definePrompt({
  name: 'personalizedFinancialInsightsPrompt',
  input: {schema: promptInputSchema},
  output: {schema: FinancialInsightsOutputSchema},
  model: 'googleai/gemini-pro',
  prompt: `You are KONTROLA's advanced AI financial analyst. Your tone is expert, but clear and encouraging. You avoid jargon.
Your goal is to provide a structured analysis of the user's financial data.

Analyze the user's financial data. The user's profile is:
{{{userProfile}}}

**Personal Finance Data:**
- Personal Income (JSON): {{{personalIncome}}}
- Personal Expenses (JSON): {{{personalExpenses}}}
- Personal Savings Goals (JSON): {{{personalSavingsGoals}}}
- Personal Budgets (JSON): {{{personalBudgets}}}

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

3.  **keyObservations**: Provide 2-3 key observations. For each, specify a title, description, and severity.
    - **Positive**: Highlight something they are doing well (e.g., high income source, low spending in a key category).
    - **Neutral**: Point out a significant financial fact (e.g., "Your largest expense category is Rent.").
    - **Warning**: Identify a potential problem area (e.g., "Your 'Dining Out' spending has increased by 30% this month.").

4.  **actionableRecommendations**: Provide 1-2 powerful, actionable recommendations.
    -   **Budget Suggestion**: Analyze the user's personal expenses from the last month. If you find a category (other than 'Rent' or essentials like bills) with high spending where no monthly budget is set, suggest creating one. For the action, use \`{"type": "CREATE_BUDGET", "category": "...", "amount": ..., "period": "monthly"}\`. The suggested amount should be a realistic reduction (e.g., 10-15% less) from their current average monthly spending in that category, rounded to a sensible number. The title should be like "Control Your [Category] Spending" and the description should explain how much they could save.
    -   **Savings Goal Suggestion**: If the user has a positive savings rate but no active savings goals, suggest creating one. A good name would be 'Emergency Fund' or 'Rainy Day Fund'. The target amount could be 3x their average monthly expenses. For the action, use \`{"type": "CREATE_SAVINGS_GOAL", "name": "...", "targetAmount": ...}\`.
    -   **Goal Contribution Suggestion**: If a user has a savings goal and a positive savings rate (surplus), create a recommendation that links their surplus to the goal. For example: "You have a monthly surplus of [Amount]. You could contribute this to your '[Goal Name]' goal to reach it faster!". For this, use the action type \`{"type": "INFO_ONLY"}\`.
    -   Each recommendation must have a title, a detailed description, and a corresponding action object.

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
