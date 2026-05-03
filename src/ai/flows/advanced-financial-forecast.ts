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

const BillSchema = z.object({
    name: z.string(),
    amount: z.number(),
    dueDate: z.string(),
    status: z.string(),
});

const LinkedAccountSchema = z.object({
    institutionName: z.string(),
    accountName: z.string(),
    balance: z.number(),
    currency: z.string(),
});

const AdvancedForecastInputSchema = z.object({
    profile: UserProfileSchema,
    allIncome: z.array(IncomeSourceSchema),
    allExpenses: z.array(ExpenseSchema),
    allBudgets: z.array(BudgetSchema),
    allSavingsGoals: z.array(SavingsGoalSchema),
    allBills: z.array(BillSchema).optional(),
    allAccounts: z.array(LinkedAccountSchema).optional(),
    userId: z.string().describe("The user's unique ID for usage tracking."),
    idToken: z.string().describe("Firebase ID token for server-side auth validation."),
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
    error: z.string().optional().describe("Error message if forecasting fails."),
});
export type AdvancedForecastOutput = z.infer<typeof AdvancedForecastOutputSchema>;

const forecastPrompt = ai.definePrompt({
  name: 'advancedForecastPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
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

**Upcoming & Unpaid Bills:**
{{#each allBills}}
- {{name}}: {{amount}} (Due: {{dueDate}}, Status: {{status}})
{{else}}
- No bill data.
{{/each}}

**Linked Bank/Momo Accounts:**
{{#each allAccounts}}
- {{institutionName}} ({{accountName}}): {{balance}} {{currency}}
{{else}}
- No linked accounts.
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
    // 1. Initialize Firebase & Verify Auth
    const { initializeFirebase } = await import('@/firebase/server');
    const { firebaseAdminApp, firestore } = initializeFirebase();
    
    if (!firebaseAdminApp || !firestore) {
         throw new Error("Server configuration error: Database not initialized.");
    }
    
    const admin = await import('firebase-admin');
    try {
         const decodedToken = await admin.auth(firebaseAdminApp).verifyIdToken(input.idToken);
         if (decodedToken.uid !== input.userId) {
              throw new Error("IDOR Attempt: Authenticated UID does not match requested userId.");
         }
    } catch (e: any) {
         throw new Error(`Authentication failed: ${e.message}`);
    }

    // 2. Rate Limiting Enforcement
    const { checkRateLimit } = await import('@/lib/rate-limiter');
    const rateLimit = await checkRateLimit(firestore, input.userId, 'ai_flow');
    
    if (!rateLimit.allowed) {
        throw new Error(`Daily AI quota reached. You have 0 of ${rateLimit.limit} requests remaining today. Upgrade your plan for higher limits.`);
    }

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
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === '<your_gemini_api_key>') {
        return { 
            shortTermForecast: "", 
            longTermOutlook: "", 
            scenarioAnalysis: [], 
            actionableAdvice: [], 
            error: "The Financial Forecast service is currently unavailable. Please contact support." 
        };
    }

    try {
        return await generateAdvancedForecastFlow(input);
    } catch (error: any) {
        console.error("❌ [AI Flow Error] generateAdvancedForecast failed:", error.message || error);
        
        let userMessage = "The Financial Forecast is currently unavailable. Please try again later.";
        const errorMessage = error.message?.toLowerCase() || "";
        
        if (errorMessage.includes("expired")) {
            userMessage = "AI API Key Expired. Please renew your GEMINI_API_KEY.";
        } else if (errorMessage.includes("invalid_argument") || errorMessage.includes("400")) {
            userMessage = "The Forecast Engine is experiencing a configuration issue. Our engineers have been notified.";
        } else if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("rate limit")) {
            userMessage = "AI Rate Limit Reached. Please wait a moment before retrying.";
        }
        
        return { 
            shortTermForecast: "", 
            longTermOutlook: "", 
            scenarioAnalysis: [], 
            actionableAdvice: [], 
            error: userMessage 
        };
    }
}


