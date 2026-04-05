'use server';
/**
 * @fileOverview An AI flow for generating personalized financial insights.
 */

import { ai, googleAI, extractJsonFromText } from '@/ai/genkit';
import { z } from 'zod';
import { format } from 'date-fns';

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


const FinancialDataInputSchema = z.object({
  profile: UserProfileSchema,
  income: z.array(IncomeExpenseSchema),
  expenses: z.array(IncomeExpenseSchema),
  budgets: z.array(BudgetSchema).optional(),
  savingsGoals: z.array(SavingsGoalSchema).optional(),
  question: z.string().optional().describe("A follow-up question from the user."),
  history: z.array(z.object({
    role: z.enum(['user', 'model', 'assistant']),
    content: z.string(),
  })).optional().describe("Previous conversation history for context."),
});

export type FinancialInsightsInput = z.infer<typeof FinancialDataInputSchema>;

const FinancialInsightsOutputSchema = z.object({
  overallSummary: z.string().describe("A brief, friendly summary of the user's overall financial health this month."),
  savingsRate: z.object({
    rate: z.number().describe("The user's savings rate as a percentage."),
    analysis: z.string().describe("A short analysis of the savings rate."),
  }),
  keyObservations: z.array(z.object({
    title: z.string(),
    description: z.string(),
    severity: z.enum(['positive', 'neutral', 'warning']),
  })).describe("A list of 2-3 most important observations."),
  actionableRecommendations: z.array(z.object({
    title: z.string(),
    description: z.string(),
    action: z.object({
      type: z.enum(['CREATE_BUDGET', 'SET_GOAL', 'INFO_ONLY']),
      details: z.record(z.any()).optional(),
    }),
  })).describe("A list of 1-2 actionable recommendations."),
  businessInsights: z.object({
    profitMargin: z.object({
      margin: z.number(),
      analysis: z.string(),
    }),
    recommendation: z.string(),
  }).optional(),
  followUpAnswer: z.string().optional().describe("The answer to the user's follow-up question, if one was provided."),
});
export type FinancialInsightsOutput = z.infer<typeof FinancialInsightsOutputSchema>;

const prompt = ai.definePrompt({
  name: 'financialInsightsPrompt',
  model: 'googleai/gemini-flash-latest',
  output: {
    format: 'json',
    schema: FinancialInsightsOutputSchema,
  },
  prompt: `You are KONTROLA, a friendly and expert financial advisor. 
You provide personalized insights based on a user's financial data.

{{#if question}}
**CONVERSATION MODE:**
The user has a follow-up question regarding their finances. 
Answer it accurately using their data and history. 
Always include the full financial analysis (summary, savings rate, etc.) in the mandatory JSON fields, but use the 'followUpAnswer' field to address their specific question.

**USER QUESTION:**
"{{{question}}}"
{{else}}
**REPORT MODE:**
Generate a comprehensive financial health report for this month.
{{/if}}

{{#if history}}
**CONVERSATION HISTORY:**
{{#each history}}
- {{role}}: {{content}}
{{/each}}
{{/if}}

**FINANCIAL DATA FOR ANALYSIS:**
---
* User: {{{profile.firstName}}} (Plan: {{{profile.plan}}})
* Currency: {{{profile.preferredCurrency}}}

**Current Income:**
{{#each income}}- {{name}}: {{amount}} ({{date}}){{else}}- None{{/each}}

**Current Expenses:**
{{#each expenses}}- {{description}}: {{amount}} ({{date}}){{else}}- None{{/each}}

**Budgets & Goals:**
{{#each budgets}}- {{name}}: {{amount}} ({{period}} Category: {{category}}){{/each}}
{{#each savingsGoals}}- {{name}}: {{currentAmount}} / {{targetAmount}}{{/each}}
---
`,
});

const getPersonalizedFinancialInsightsFlow = ai.defineFlow(
  {
    name: 'getPersonalizedFinancialInsightsFlow',
    inputSchema: FinancialDataInputSchema,
    outputSchema: FinancialInsightsOutputSchema,
  },
  async (input) => {
    try {
      const normalizedHistory = input.history?.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        content: msg.content
      })) || [];

      const response = await prompt({ ...input, history: normalizedHistory });
      if (!response.output) throw new Error("No structured output returned.");
      return response.output;
    } catch (e: any) {
      console.error("Failed to generate financial insights:", e.message || e);
      throw new Error("Invalid response from advisor intelligence.");
    }
  }
);

export async function generateFinancialInsights(input: FinancialInsightsInput): Promise<FinancialInsightsOutput> {
  try {
    return await getPersonalizedFinancialInsightsFlow(input);
  } catch (error: any) {
    console.error("❌ [AI Flow Error] generateFinancialInsights failed:", error.message || error);
    
    let userMessage = "The Financial Advisor is currently unavailable. Please try again later.";
    const errorMessage = error.message?.toLowerCase() || "";
    
    if (errorMessage.includes("expired")) {
      userMessage = "AI API Key Expired. Please renew your GEMINI_API_KEY.";
    } else if (errorMessage.includes("invalid_argument") || errorMessage.includes("400")) {
      userMessage = "Invalid AI configuration. Check your GEMINI_API_KEY.";
    } else if (errorMessage.includes("permission-denied") || errorMessage.includes("permission_denied") || errorMessage.includes("403")) {
      userMessage = "Database Permission Denied. Check your FIREBASE_SERVICE_ACCOUNT.";
    } else if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("rate limit")) {
      userMessage = "AI Rate Limit Reached. Please wait a moment.";
    } else if (errorMessage.includes("no structured output")) {
      userMessage = "The AI failed to format the response correctly. Retrying might help.";
    }
    
    throw new Error(userMessage);
  }
}
