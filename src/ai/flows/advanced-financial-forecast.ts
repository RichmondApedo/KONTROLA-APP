'use server';
/**
 * @fileOverview An AI flow for generating an advanced, long-term financial forecast.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const UserProfileSchema = z.object({
    firstName: z.string().optional(),
    plan: z.string(),
    preferredCurrency: z.string(),
});

const IncomeSourceSchema = z.object({
    name: z.string(),
    amount: z.number(),
    date: z.string(),
});

const ExpenseSchema = z.object({
    description: z.string(),
    amount: z.number(),
    category: z.string(),
    date: z.string(),
});

const BudgetSchema = z.object({
    name: z.string(),
    amount: z.number(),
    period: z.string(),
    category: z.string(),
});

const SavingsGoalSchema = z.object({
    name: z.string(),
    currentAmount: z.number(),
    targetAmount: z.number(),
});

const AdvancedForecastInputSchema = z.object({
    profile: UserProfileSchema,
    allIncome: z.array(IncomeSourceSchema),
    allExpenses: z.array(ExpenseSchema),
    allBudgets: z.array(BudgetSchema),
    allSavingsGoals: z.array(SavingsGoalSchema),
});
export type AdvancedForecastInput = z.infer<typeof AdvancedForecastInputSchema>;

const AdvancedForecastOutputSchema = z.object({
    shortTermForecast: z.string().describe("A detailed 3-6 month forecast covering cash flow, savings potential, and budget adherence."),
    longTermOutlook: z.string().describe("A 1-5 year outlook on financial growth, goal achievement probability, and major financial milestones."),
    scenarioAnalysis: z.array(z.object({
        scenario: z.string().describe("A potential financial scenario (e.g., 'Increased Savings', 'Major Unexpected Expense')."),
        impact: z.string().describe("The likely impact of this scenario on the user's financial health."),
    })).describe("Analysis of 2-3 realistic 'what-if' scenarios."),
    actionableAdvice: z.array(z.string()).describe("A list of 3-5 concrete, actionable steps the user can take based on the forecast."),
});
export type AdvancedForecastOutput = z.infer<typeof AdvancedForecastOutputSchema>;

const forecastPrompt = ai.definePrompt({
  name: 'advancedForecastPrompt',
  model: 'gemini-pro',
  output: { schema: AdvancedForecastOutputSchema },
  prompt: `You are a world-class financial analyst AI. Your task is to provide a comprehensive, multi-faceted financial forecast for a user based on their complete financial history. Be insightful, realistic, and provide clear, actionable advice.

Analyze the user's income, expenses, budgets, and savings goals to generate the following:
1.  **Short-Term Forecast (3-6 Months):** Project cash flow, identify potential shortfalls or surpluses, and assess budget performance.
2.  **Long-Term Outlook (1-5 Years):** Project wealth growth, estimate when savings goals will be met, and identify key financial decision points.
3.  **Scenario Analysis:** Create 2-3 realistic "what-if" scenarios (e.g., a 10% increase in income, a major unexpected expense) and describe their potential impact.
4.  **Actionable Advice:** Provide 3-5 specific, prioritized recommendations to improve their financial future.

Here is the user's data:
---
**Profile:**
- Name: {{{profile.firstName}}}
- Plan: {{{profile.plan}}}
- Currency: {{{profile.preferredCurrency}}}

**All-Time Income:**
{{#each allIncome}}
- {{name}}: {{amount}} on {{date}}
{{else}}
- No income data.
{{/each}}

**All-Time Expenses:**
{{#each allExpenses}}
- {{description}} ({{category}}): {{amount}} on {{date}}
{{else}}
- No expense data.
{{/each}}

**Budgets:**
{{#each allBudgets}}
- {{name}}: {{amount}} per {{period}} for {{category}}
{{else}}
- No budget data.
{{/each}}

**Savings Goals:**
{{#each allSavingsGoals}}
- {{name}}: {{currentAmount}} / {{targetAmount}}
{{else}}
- No savings goals.
{{/each}}
---
`,
});

const generateAdvancedForecastFlow = ai.defineFlow(
  {
    name: 'generateAdvancedForecastFlow',
    inputSchema: AdvancedForecastInputSchema,
    outputSchema: AdvancedForecastOutputSchema,
  },
  async (input) => {
    const response = await prompt(input);
    return response.output!;
  }
);

export async function generateAdvancedForecast(input: AdvancedForecastInput): Promise<AdvancedForecastOutput> {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === '<your_gemini_api_key>') {
        throw new Error("The Gemini API Key is not configured on the server. Please add it to the .env file to use AI features.");
    }
    return generateAdvancedForecastFlow(input);
}
