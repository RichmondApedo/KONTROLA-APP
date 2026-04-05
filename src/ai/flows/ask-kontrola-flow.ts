'use server';
/**
 * @fileOverview An AI flow for answering user questions about the Kontrola app.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const UserProfileSchema = z.object({
    firstName: z.string().optional(),
    plan: z.string(),
    preferredCurrency: z.string(),
});

const askKontrolaSchema = z.object({
    question: z.string().describe("The user's question."),
    currentDate: z.string().describe("The current date, to provide context to the AI."),
    profile: UserProfileSchema.describe("The user's profile information."),
    userId: z.string().describe("The user's unique ID for usage tracking."),
    history: z.array(z.object({
        role: z.enum(['user', 'model', 'assistant']),
        content: z.string(),
    })).optional().describe("Previous messages in this conversation for context."),
});

export type AskKontrolaInput = z.infer<typeof askKontrolaSchema>;

const AskKontrolaOutputSchema = z.object({
    answer: z.string().describe("The answer to the user's question."),
});
export type AskKontrolaOutput = z.infer<typeof AskKontrolaOutputSchema>;

const prompt = ai.definePrompt({
  name: 'askKontrolaPrompt',
  model: 'googleai/gemini-flash-latest',
  prompt: `You are Ask, the friendly and expert AI assistant for the KONTROLA financial management application.
Your goal is to provide clear, helpful, and encouraging answers to user questions about how to use the app's features to manage their finances and achieve their goals.

**IMPORTANT RULE:** You CANNOT see the user's financial data (income, expenses, balances, etc.). If the user asks for a summary or analysis of their finances, you MUST politely explain that you cannot access their data for privacy reasons, but you can guide them to the right page (like 'Dashboard' or 'Reports') where they can see it themselves.

**APP FEATURES KNOWLEDGE BASE:**
*   **Dashboard:** Main overview.
*   **Income & Expenses:** Manual tracking.
*   **Account Sync:** Link banks/Mobile Money (read-only).
*   **Budgets (Premium):** Category-specific spending control.
*   **Market List (Premium):** Shopping lists to expenses.
*   **Bills (Premium):** Bill reminders.
*   **Goals (Premium):** Savings progress.
*   **Reports:** Detailed analytics & export.
*   **Business Suite (Pro Plus):** CRM, invoicing, receipts.

**CONTEXT FOR THIS CONVERSATION:**
- Today: {{{currentDate}}}
- User Name: {{{profile.firstName}}}
- Current Plan: {{{profile.plan}}}

{{#if history}}
**CONVERSATION HISTORY:**
{{#each history}}
- {{role}}: {{content}}
{{/each}}
{{/if}}

**USER'S LATEST QUESTION:**
"{{{question}}}"
`,
});

const generateAnswerFlow = ai.defineFlow(
  {
    name: 'askKontrolaFlow',
    inputSchema: askKontrolaSchema,
    outputSchema: AskKontrolaOutputSchema,
  },
  async (input) => {
    // Normalizing history roles for Genkit/Gemini consistency (user, model)
    const normalizedHistory = input.history?.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        content: msg.content
    })) || [];

    let usageRef: any = null;
    let currentCount = 0;
    const today = new Date().toISOString().split('T')[0];

    // Usage Tracking for Free Tier
    if (input.profile.plan === 'free') {
      const { initializeFirebase } = await import('@/firebase/server');
      const { firestore } = initializeFirebase();
      if (firestore) {
         usageRef = firestore.collection('users').doc(input.userId).collection('aiUsage').doc('chatbot');
         const usageDoc = await usageRef.get();
         if (usageDoc.exists) {
            const data = usageDoc.data();
            if (data?.date === today) currentCount = data.count || 0;
         }
         if (currentCount >= 5) throw new Error("Free tier limit reached. Upgrade to Premium for status.");
      }
    }

    const response = await prompt({ ...input, history: normalizedHistory });
    const text = response.text || "";

    if (!text) return { answer: "I'm sorry, I couldn't formulate an answer. Please try again." };
    
    if (usageRef) await usageRef.set({ date: today, count: currentCount + 1 }, { merge: true });

    return { answer: text };
  }
);

export async function askKontrola(input: AskKontrolaInput): Promise<AskKontrolaOutput> {
    try {
        return await generateAnswerFlow(input);
    } catch (error: any) {
        console.error("❌ [AI Flow Error] askKontrolaFlow failed:", error.message || error);
        
        let userMessage = "I'm having trouble thinking right now. Please try again later.";
        
        const errorMessage = error.message?.toLowerCase() || "";
        
        if (errorMessage.includes("expired")) {
            userMessage = "The AI service is unavailable because the API key has expired. Please renew the GEMINI_API_KEY in your .env file.";
        } else if (errorMessage.includes("invalid_argument") || errorMessage.includes("400")) {
            userMessage = "The AI service configuration is invalid. Please check your GEMINI_API_KEY.";
        } else if (errorMessage.includes("free tier limit reached")) {
            userMessage = error.message;
        } else if (errorMessage.includes("permission-denied") || errorMessage.includes("permission_denied") || errorMessage.includes("403")) {
            userMessage = "I don't have permission to access the necessary data. This usually means the FIREBASE_SERVICE_ACCOUNT is missing or invalid.";
        } else if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("rate limit")) {
            userMessage = "The AI service is currently busy (Rate Limited). Please try again in 1 minute.";
        }
        
        throw new Error(userMessage);
    }
}


