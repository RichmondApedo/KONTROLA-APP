'use server';
/**
 * @fileOverview An AI flow for generating an advanced, long-term financial forecast.
 */

import { ai, googleAI, extractJsonFromText } from '@/ai/genkit';
import { z } from 'zod';
import { format } from 'date-fns';

const UserProfileSchema = z.object({
    firstName: z.string().optional(),
    plan: z.string(),
    preferredCurrency: z.string(),
});

const IncomeSourceSchema = z.object({
    name: z.string().optional(),
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
    name: z.string().optional(),
    amount: z.number(),
    period: z.string(),
    category: z.string(),
});

const SavingsGoalSchema = z.object({
    name: z.string().optional(),
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
  model: 'googleai/gemini-flash-latest',
  output: {
    format: 'json',
    schema: AdvancedForecastOutputSchema,
  },
  prompt: `You are a world-class financial analyst AI. Your task is to provide a comprehensive, multi-faceted financial forecast for a user based on their complete financial history.

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
    try {
      const response = await forecastPrompt(input);
      if (!response.output) {
        throw new Error("No structured output returned from model.");
      }
      return response.output;
    } catch (e: any) {
      console.error("Failed to generate advanced forecast AI:", e.message || e);
      throw new Error("The AI returned an invalid response. Please try again.");
    }
  }
);

export async function generateAdvancedForecast(input: AdvancedForecastInput): Promise<AdvancedForecastOutput> {
    try {
        return await generateAdvancedForecastFlow(input);
    } catch (error: any) {
        console.error("❌ [AI Flow Error] generateAdvancedForecast failed:", error.message || error);
        
        let userMessage = "I'm having trouble generating your forecast right now. Please try again later.";
        
        if (error.message?.includes("API key expired")) {
            userMessage = "The AI service is unavailable because the API key has expired. Please renew the GEMINI_API_KEY.";
        } else if (error.message?.includes("permission-denied") || error.message?.includes("PERMISSION_DENIED")) {
            userMessage = "I don't have permission to access the necessary data. Check your Firestore rules or Service Account.";
        }
        
        throw new Error(userMessage);
    }
}


