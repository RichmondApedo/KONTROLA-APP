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

const BillSchema = z.object({
    name: z.string(),
    amount: z.number(),
    dueDate: z.string(),
});

const SafeToSaveInputSchema = z.object({
    profile: UserProfileSchema,
    currentBalance: z.number(),
    recentTransactions: z.array(TransactionSchema), // Last 90 days
    allBills: z.array(BillSchema).optional(),
    userId: z.string().describe("The user's unique ID for usage tracking."),
    idToken: z.string().describe("Firebase ID token for server-side auth validation."),
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
  model: 'googleai/gemini-1.5-flash-latest', // Using 1.5 Flash for speed and reliability
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

**Pending & Unpaid Bills (OBLIGATIONS)**:
{{#each allBills}}
- {{name}}: {{amount}} due on {{dueDate}}
{{else}}
- No explicit unpaid bills found.
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
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === '<your_gemini_api_key>') {
        throw new Error("The AI service is currently unavailable. Please contact support.");
    }
    
    try {
        return await generateSafeToSaveFlow(input);
    } catch (error: any) {
        console.error("❌ [AI Flow Error] generateSafeToSaveInsight failed:", error.message || error);
        
        let userMessage = "The Safe-to-Save calculation is currently unavailable. Please try again later.";
        const errorMessage = error.message?.toLowerCase() || "";
        
        if (errorMessage.includes("expired")) {
            userMessage = "The AI service is temporarily unavailable due to an expired key.";
        } else if (errorMessage.includes("invalid_argument") || errorMessage.includes("400")) {
            userMessage = "The AI Engine is experiencing a configuration issue.";
        } else if (errorMessage.includes("permission-denied") || errorMessage.includes("permission_denied") || errorMessage.includes("403")) {
            userMessage = "Database Permission Denied. Check your FIREBASE_SERVICE_ACCOUNT.";
        } else if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("rate limit")) {
            userMessage = "AI Rate Limit Reached. Please wait a moment.";
        }
        
        throw new Error(userMessage);
    }
}
