'use server';
/**
 * @fileOverview An AI-powered flow to generate advanced financial forecasts.
 *
 * - generateAdvancedForecast - A function that analyzes a user's complete financial picture and provides long-term forecasts and advice.
 * - AdvancedForecastInput - The input type for the flow.
 * - AdvancedForecastOutput - The output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { IncomeSource, Expense, Budget, SavingsGoal, UserProfile } from '@/lib/types';
import { MODELS } from '@/ai/models';

// Using z.custom() because the full types are complex and defined elsewhere.
// The prompt will receive these as stringified JSON.
const AdvancedForecastInputSchema = z.object({
  userProfile: z.custom<UserProfile>(),
  incomeSources: z.custom<IncomeSource[]>(),
  expenses: z.custom<Expense[]>(),
  budgets: z.custom<Budget[]>(),
  savingsGoals: z.custom<SavingsGoal[]>(),
});
export type AdvancedForecastInput = z.infer<typeof AdvancedForecastInputSchema>;

const ScenarioSchema = z.object({
  scenario: z.string().describe("The description of a potential financial scenario, e.g., 'If you increase your savings by 10% monthly'."),
  impact: z.string().describe("The likely financial impact of this scenario."),
});

const AdvancedForecastOutputSchema = z.object({
  shortTermForecast: z.string().describe("A 3-6 month financial forecast based on current trends. Should be a detailed paragraph."),
  longTermOutlook: z.string().describe("A 1-5 year financial outlook, considering goals and habits. Should be a detailed paragraph."),
  scenarioAnalysis: z.array(ScenarioSchema).describe("An analysis of 2-3 potential 'what-if' scenarios based on the user's data."),
  actionableAdvice: z.array(z.string()).describe("A list of 3-5 concrete, actionable steps the user can take to improve their financial health."),
});
export type AdvancedForecastOutput = z.infer<typeof AdvancedForecastOutputSchema>;

export async function generateAdvancedForecast(input: AdvancedForecastInput): Promise<AdvancedForecastOutput> {
  const stringifiedInput = {
    userProfile: JSON.stringify(input.userProfile),
    incomeSources: JSON.stringify(input.incomeSources),
    expenses: JSON.stringify(input.expenses),
    budgets: JSON.stringify(input.budgets),
    savingsGoals: JSON.stringify(input.savingsGoals),
  };
  return advancedFinancialForecastFlow(stringifiedInput);
}

const stringifiedInputSchema = z.object({
  userProfile: z.string(),
  incomeSources: z.string(),
  expenses: z.string(),
  budgets: z.string(),
  savingsGoals: z.string(),
});

const prompt = ai.definePrompt({
  name: 'advancedFinancialForecastPrompt',
  input: { schema: stringifiedInputSchema },
  output: { schema: AdvancedForecastOutputSchema },
  model: MODELS.TEXT,
  prompt: `You are a sophisticated financial analyst AI, providing projections for users of the KONTROLA app.
Analyze the user's complete financial data provided below in JSON format.

User Profile:
{{{userProfile}}}

Income Sources (recent history):
{{{incomeSources}}}

Expenses (recent history):
{{{expenses}}}

Active Budgets:
{{{budgets}}}

Savings Goals:
{{{savingsGoals}}}

Based on ALL of the data provided, generate a comprehensive financial forecast.
Your analysis should be insightful, data-driven, and encouraging.
The user's preferred currency is specified in their profile. Use it for any monetary values in your response.

Produce the following outputs:
1.  **shortTermForecast**: A detailed paragraph projecting the user's financial situation over the next 3-6 months. Consider cash flow, spending habits, and budget adherence.
2.  **longTermOutlook**: A detailed paragraph on their financial outlook for the next 1-5 years. Analyze their ability to meet savings goals and suggest long-term strategies.
3.  **scenarioAnalysis**: Create 2-3 insightful "what-if" scenarios. Each scenario should be an object with a 'scenario' description and its potential financial 'impact'. Examples: "What if you cut 'Dining Out' spending by 50%?" or "What if you invested your surplus cash?".
4.  **actionableAdvice**: Provide a list of 3-5 clear, concrete, and actionable recommendations to help the user improve their financial health or reach their goals faster.
`,
});

const advancedFinancialForecastFlow = ai.defineFlow(
  {
    name: 'advancedFinancialForecastFlow',
    inputSchema: stringifiedInputSchema,
    outputSchema: AdvancedForecastOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
