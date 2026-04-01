'use server';
/**
 * @fileOverview An AI flow for answering user questions about the Kontrola app.
 */

import { ai, googleAI } from '@/ai/genkit';
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

export async function askKontrolaFlow(input: AskKontrolaInput): Promise<AskKontrolaOutput> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key' || apiKey === '<your_gemini_api_key>') {
        console.error("❌ [AI Service] GEMINI_API_KEY is not configured.");
        throw new Error("The AI service is currently unavailable as the API key is missing or invalid. Please check the server logs.");
    }
    
    try {
        return await generateAnswerFlow(input);
    } catch (error: any) {
        console.error("❌ [AI Flow Error] askKontrolaFlow failed:", error.message || error);
        throw new Error(error.message || "I'm having trouble thinking right now. Please try again later.");
    }
}


