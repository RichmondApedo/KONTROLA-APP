'use server';
/**
 * @fileOverview An AI flow for calculating a 'Safe-to-Save' amount based on transaction history.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const UserProfileSchema = z.object({
    firstName: z.string().optional(),
    plan: z.string(),
    preferredCurrency: z.string(),
});

const TransactionSchema = z.object({
    description: z.string().optional(),
    name: z.string().optional(),
    amount: z.number(),
    category: z.string(),
    date: z.string(),
    type: z.enum(['income', 'expense']),
});

const SafeToSaveInputSchema = z.object({
    profile: UserProfileSchema,
    currentBalance: z.number(),
    recentTransactions: z.array(TransactionSchema), // Last 90 days
});
export type SafeToSaveInput = z.infer<typeof SafeToSaveInputSchema>;

const SafeToSaveOutputSchema = z.object({
    safeAmount: z.number().describe("The recommended amount to save today."),
    reasoning: z.string().describe("A friendly, high-level explanation of why this amount is safe."),
    upcomingObligation: z.object({
        name: z.string(),
        amount: z.number(),
        date: z.string(),
    }).optional().describe("The next major expense that the AI is protecting liquidity for."),
    confidence: z.number().describe("Confidence score from 0 to 100."),
});
export type SafeToSaveOutput = z.infer<typeof SafeToSaveOutputSchema>;

const safeToSavePrompt = ai.definePrompt({
  name: 'safeToSavePrompt',
  model: 'googleai/gemini-2.0-flash', // Using 2.0 Flash for speed and reliability
  output: {
    format: 'json',
    schema: SafeToSaveOutputSchema,
  },
  prompt: `You are a highly conservative financial co-pilot. Your task is to analyze a user's transaction history and current balance to identify a "Safe-to-Save" amount.

**Goal**: Identify a surplus that can be moved to savings *without* risking the user's ability to pay upcoming bills or maintain a basic daily spending buffer.

**Calculations Logic**:
1.  **Identify Patterns**: Look at the last 90 days. Note recurring fixed costs (Rent/Utility/Subscriptions) and their typical dates.
2.  **Weighting**: Give 60% priority to the last 30 days of data and 40% to the previous 60 days.
3.  **Project Outflows**: Estimate the total expected outflows between *today* and the user's *next* expected major income.
4.  **Buffer**: Subtract a 15% safety buffer from the remaining liquidity.
5.  **Output**: If a surplus exists, suggest it as the 'safeAmount'.

**Output Constraints**:
- If the current balance is critically low relative to upcoming bills, set 'safeAmount' to 0 and explain why.
- Reasoning should be encouraging but realistic.

Here is the user's data:
---
**Profile**:
- Name: {{{profile.firstName}}}
- Currency: {{{profile.preferredCurrency}}}
- Current Balance: {{{currentBalance}}}

**Transaction History (Last 90 Days)**:
{{#each recentTransactions}}
- {{#if name}}{{name}}{{else}}{{description}}{{/if}} ({{category}}): {{amount}} as {{type}} on {{date}}
{{else}}
- No significant transaction history found.
{{/each}}
---
`,
});

const generateSafeToSaveFlow = ai.defineFlow(
  {
    name: 'generateSafeToSaveFlow',
    inputSchema: SafeToSaveInputSchema,
    outputSchema: SafeToSaveOutputSchema,
  },
  async (input) => {
    try {
      const response = await safeToSavePrompt(input);
      if (!response.output) {
        throw new Error("No structured output returned from model.");
      }
      return response.output;
    } catch (e: any) {
      console.error("Failed to generate safe-to-save insight:", e.message || e);
      throw new Error("The AI was unable to calculate a safe savings amount at this time.");
    }
  }
);

export async function generateSafeToSaveInsight(input: SafeToSaveInput): Promise<SafeToSaveOutput> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Gemini API Key is missing.");
    }
    
    return generateSafeToSaveFlow(input);
}
