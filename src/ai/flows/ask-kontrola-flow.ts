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
    idToken: z.string().describe("Firebase ID token for server-side auth validation."),
});

export type AskKontrolaInput = z.infer<typeof askKontrolaSchema>;

const AskKontrolaOutputSchema = z.object({
    answer: z.string().optional().describe("The answer to the user's question. Optional if there's an error."),
    error: z.string().optional().describe("Error message if the flow fails."),
});
export type AskKontrolaOutput = z.infer<typeof AskKontrolaOutputSchema>;

const prompt = ai.definePrompt({
  name: 'askKontrolaPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  prompt: `You are Ask, the dedicated Support and Training Assistant for the KONTROLA financial management application.

**YOUR PRIMARY MISSION:**
Your ONLY purpose is to assist and train users on how to use the KONTROLA app and its various features. You are an expert on the application's interface, tools, and functionalities.

**STRICT SCOPE LIMITATION:**
1. You ONLY answer questions related to the KONTROLA app features, navigation, and settings.
2. If a user asks for general financial advice (e.g., "how should I invest my money?", "what is a good savings rate?"), you MUST politely decline and remind them that your mission is specifically to help them master the KONTROLA app.
3. If a user asks about topics unrelated to the app, decline and steer the conversation back to app support.

**APP FEATURES KNOWLEDGE BASE:**
*   **Command Hub (Identity Strip):** At the top of most pages, the Identity Strip (e.g., "Primary Workspace") identifies which business account is active. Users can switch between Business and Personal contexts here.
*   **Classic Professional UI:** A high-contrast, "Bank-Tier" design optimized for mobile responsiveness and professional readability. It features high stability and solid, premium card layouts.
*   **Mobile Action Dock:** A sticky bottom dock on mobile devices providing "One-Handed" access to primary actions like "New Invoice," "New Receipt," and "Quick Log."
*   **Working Capital Dashboard (Strategic Intelligence):** A business-focused dashboard dedicated to "Liquidity Health." It tracks "Accounts Receivable" (pending customer payments) and "Accounts Payable" (unpaid supplier bills) to forecast strategic business cash flow.
*   **Multi-Account Manager (Pro Plus):** Allows users to launch multiple independent business accounts ("Workspaces"). This is accessible via the "Account Manager" or "Command Hub" prompts.
*   **Business Suite (Pro Plus):** CRM, vendor tracking, professional invoicing, and business receipt generation.
*   **Dashboard:** Main overview showing net liquidity, income, outflow, and the Kontrola Score.
*   **Account Sync:** Link bank accounts or Mobile Money (read-only) for automatic transaction syncing via Mono or Paystack.
*   **Budgets & Bills (Premium):** Category-specific spending control and recurring bill tracking with reminders.
*   **Goals (Premium):** Advanced savings goals with progress tracking.
*   **Reports:** Professional financial analytics with PDF/Excel export.
*   **Advisor:** Personalized financial insights and strategic forecasting (separate from this support chat).

**IMPORTANT SECURITY RULE:** You CANNOT see the user's personal financial data (transaction amounts, balances, etc.). If they ask, guide them to the 'Dashboard' or 'Reports' page to view it themselves.

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

    // Security Verification: Ensure the calling user is authenticated and matches input.userId
    const { initializeFirebase } = await import('@/firebase/server');
    const { firebaseAdminApp, firestore } = initializeFirebase();
    
    if (!firebaseAdminApp) {
         throw new Error("Server configuration error: Firebase Admin not initialized.");
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

    // Usage Tracking for Free Tier
    if (input.profile.plan === 'free') {
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
            userMessage = "The AI service is temporarily unavailable due to an expired key. Support has been notified.";
        } else if (errorMessage.includes("invalid_argument") || errorMessage.includes("400")) {
            userMessage = "The AI Assistant is currently experiencing a configuration issue.";
        } else if (errorMessage.includes("free tier limit reached")) {
            userMessage = error.message;
        } else if (errorMessage.includes("permission-denied") || errorMessage.includes("permission_denied") || errorMessage.includes("403")) {
            userMessage = "I don't have permission to access the necessary data. This usually means the FIREBASE_SERVICE_ACCOUNT is missing or invalid.";
        } else if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("rate limit")) {
            userMessage = "The AI service is currently busy (Rate Limited). Please try again in 1 minute.";
        }
        
        return { error: userMessage };
    }
}


