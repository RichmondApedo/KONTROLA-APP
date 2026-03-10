'use server';
/**
 * @fileOverview A friendly chatbot to assist users with the KONTROLA app.
 *
 * This file exports the `askKontrola` server action.
 */

import { ai } from '@/ai/genkit';
import { 
    AskKontrolaInputSchema, 
    AskKontrolaOutputSchema, 
    type AskKontrolaInput, 
    type AskKontrolaOutput 
} from './schemas/ask-kontrola-schema';
import { initializeFirebase } from '@/firebase/server';
import { formatCurrency } from '@/lib/utils';
import { startOfMonth, endOfMonth } from 'date-fns';
import { z } from 'zod';
import { SUBSCRIPTION_PLANS } from '@/lib/plans';
import { MODELS } from '@/ai/models';


// --- CENTRALIZED KNOWLEDGE BASE ---
// This object serves as the single source of truth for the AI's static knowledge.
const knowledgeBase = {
  "income-expense": {
    description: "Users can manually add income and expenses on the 'Income' and 'Expenses' pages. They can categorize transactions and set dates. For expenses, the 'Suggest Category with AI' button provides smart suggestions."
  },
  "account-sync": {
    description: "Users can securely link their bank or mobile money accounts in read-only mode via our partner, Mono. This is available in 'Settings' under 'Connect Mobile Money / Bank'. This feature automatically syncs their transaction history, saving them from manual entry. It's highly secure, and KONTROLA never sees user login credentials."
  },
  "budgets-goals": {
    description: "This is a **Premium** feature. Budgeting helps users control their finances by setting spending limits for categories on the 'Budgets & Planning' page. Savings goals, available on the 'Savings Goals' page, help keep users motivated. Upgrading unlocks these powerful tools."
  },
  "bill-tracking": {
    description: "This is a **Premium** feature, located on the 'Bills' page. Users can track all upcoming and recurring bills in one place and receive push notification reminders to avoid late fees."
  },
  "reports-analytics": {
    description: "All users can view interactive charts on the 'Reports' page. Exporting detailed reports to **PDF and Excel** is a **Premium** feature, great for record-keeping or sharing with a financial advisor."
  },
  "business-suite": {
    description: "This is an exclusive **Pro Plus** feature, available on the 'Business' dashboard tab. It's a complete toolkit for entrepreneurs to manage customers (CRM), create professional invoices, and generate payment receipts, helping to separate business and personal finances."
  },
  "ai-advisor": {
    description: "The 'AI Advisor' page provides free, personalized insights. For deeper analysis, **Advanced AI Forecasting** is an exclusive **Pro Plus** feature on the 'Admin' page, offering long-term scenario modeling."
  },
  "kontrola-score": {
    description: "The Kontrola Score, on the 'Kontrola Score' page, is a personal financial health rating. It's calculated based on savings, spending habits, income consistency, and goal achievement, providing a way to track financial progress."
  },
  "pricing-upgrade": {
      description: `Premium costs ${formatCurrency(SUBSCRIPTION_PLANS.PREMIUM.price / 100, SUBSCRIPTION_PLANS.PREMIUM.currency)}/month and unlocks budgets, goals, and bill tracking. Pro Plus costs ${formatCurrency(SUBSCRIPTION_PLANS.PRO_PLUS.price / 100, SUBSCRIPTION_PLANS.PRO_PLUS.currency)}/month and adds the Business Suite and Advanced AI Forecasting. Users can upgrade from the 'Pricing' page.`
  }
};

// --- TOOLS ---

// Tool to analyze user spending across their entire history.
const analyzeUserSpending = ai.defineTool(
    {
        name: 'analyzeUserSpending',
        description: "Analyzes the user's total income and expenses across their entire history. Use this when the user asks to 'analyze spending' or for a 'financial summary'.",
        inputSchema: z.object({
            userId: z.string().describe("The user's unique ID."),
        }),
        outputSchema: z.string(),
    },
    async ({ userId }) => {
        const { firestore } = initializeFirebase();
        if (!firestore) {
            return "Sorry, I can't access financial data right now.";
        }

        const profileDoc = await firestore.doc(`users/${userId}/profile/${userId}`).get();
        const currency = profileDoc.exists ? (profileDoc.data()?.preferredCurrency || 'ghs') : 'ghs';

        // Fetch ALL income and expenses.
        const incomeSnapshot = await firestore.collection(`users/${userId}/incomeSources`).get();
        const expensesSnapshot = await firestore.collection(`users/${userId}/expenses`).get();

        let totalIncome = 0;
        let foodExpenses = 0;
        let totalExpenses = 0;

        incomeSnapshot.forEach((doc) => {
            totalIncome += doc.data().amount || 0;
        });

        expensesSnapshot.forEach((doc) => {
            const data = doc.data();
            totalExpenses += data.amount || 0;

            if (data.category.toLowerCase() === "food") {
            foodExpenses += data.amount || 0;
            }
        });

        const advice = [];
        if (foodExpenses > 300) { // This check is arbitrary but kept from the original logic.
            advice.push(`You've spent more than ${formatCurrency(300, currency)} on food in total. Consider reducing takeout meals.`);
        }
        if (totalExpenses > totalIncome) {
            advice.push("⚠️ Warning: Your total spending has exceeded your total income.");
        }
        if (advice.length === 0) {
            advice.push("Your spending looks balanced overall. Keep it up!");
        }

        return `
📊 **Overall Financial Summary**

- **Total Income:** ${formatCurrency(totalIncome, currency)}
- **Total Expenses:** ${formatCurrency(totalExpenses, currency)}

**Advice:**
${advice.join("\n")}
`;
    }
);

// Tool to predict future spending based on recent activity.
const predictSpending = ai.defineTool(
    {
        name: 'predictSpending',
        description: "Predicts when a user might 'run out of money' based on their average daily spending over the last 30 days. This tool can estimate how many days a fixed amount of money (500 in the user's currency) would last.",
        inputSchema: z.object({
            userId: z.string().describe("The user's unique ID."),
        }),
        outputSchema: z.object({
            days: z.number().describe("The estimated number of days. Returns -1 if there's no spending history."),
            dailyAverage: z.number().describe("The average amount spent per day."),
            currency: z.string().describe("The user's preferred currency code."),
        }),
    },
    async ({ userId }) => {
        const { firestore } = initializeFirebase();
        if (!firestore) {
            // This should not happen if the flow is running, but it's a safe guard.
            return { days: -1, dailyAverage: 0, currency: 'ghs' };
        }

        const profileDoc = await firestore.doc(`users/${userId}/profile/${userId}`).get();
        const currency = profileDoc.exists ? (profileDoc.data()?.preferredCurrency || 'ghs') : 'ghs';

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        const expensesSnapshot = await firestore.collection(`users/${userId}/expenses`)
            .where('date', '>=', thirtyDaysAgo)
            .get();

        if (expensesSnapshot.empty) {
            return { days: -1, dailyAverage: 0, currency };
        }

        let totalExpenses = 0;
        expensesSnapshot.forEach((doc) => {
            totalExpenses += doc.data().amount || 0;
        });

        const dailyAverage = totalExpenses / 30;

        if (dailyAverage === 0) {
            return { days: -1, dailyAverage: 0, currency };
        }

        // The original code used a hardcoded 500.
        const fixedAmount = 500;
        const estimatedDays = Math.floor(fixedAmount / dailyAverage);

        return { days: estimatedDays, dailyAverage, currency };
    }
);


// --- MAIN FLOW & PROMPT ---

export async function askKontrola(
  input: AskKontrolaInput
): Promise<AskKontrolaOutput> {
  return askKontrolaFlow(input);
}

// Convert the knowledge base to a string to be embedded in the prompt.
const knowledgeBaseString = JSON.stringify(knowledgeBase, null, 2);

const prompt = ai.definePrompt({
  name: 'askKontrolaPrompt',
  input: { schema: AskKontrolaInputSchema },
  output: { schema: AskKontrolaOutputSchema },
  model: MODELS.TEXT,
  tools: [analyzeUserSpending, predictSpending],
  system: `You are "Ask", a friendly and helpful AI support assistant for the KONTROLA financial management app. Your goal is to provide instant, clear, and detailed help by intelligently using the tools and information at your disposal.

--- KONTROLA KNOWLEDGE BASE ---
${knowledgeBaseString}
----------------------------------

**Guiding Principles:**
- **Consult Knowledge Base:** For questions about "how-to" use a feature, pricing details, or app concepts, you MUST consult the KNOWLEDGE BASE above. Synthesize the information into a helpful, conversational answer in your own words. Do not simply repeat the text.
- **Use Tools When Necessary:** 
  - Use the \`analyzeUserSpending\` tool ONLY when the user explicitly asks for a financial summary or analysis of their spending. 
  - Use the \`predictSpending\` tool ONLY when the user asks when they might "run out of money" or asks for a spending prediction. This requires a \`userId\`.
- **Be Generative:** If no tool or knowledge base entry fits the user's question, use your general knowledge to formulate a helpful response about financial management in the context of the KONTROLA app.
- **Tone & Style:** Maintain an encouraging and empowering tone. Frame answers to highlight the benefits of using KONTROLA, especially for premium features. Your response must be a JSON object with a single key "answer", formatted in clear markdown.
- **Human Handoff:** If a user needs further assistance, provide them with the following contact information:
    - Support Email: support@kontrolaapp.com
    - Support Line: +233 501705890
- **Scope:** If a question is unrelated to finance or the KONTROLA app, politely state your purpose and limitations.`,
  prompt: `User's Question: {{{question}}}
{{#if userId}}
User ID: {{{userId}}}
{{/if}}`,
});

const askKontrolaFlow = ai.defineFlow(
  {
    name: 'askKontrolaFlow',
    inputSchema: AskKontrolaInputSchema,
    outputSchema: AskKontrolaOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output || { answer: "I'm sorry, I couldn't find an answer to that. You can ask me about budgeting, spending analysis, or Kontrola features." };
  }
);
