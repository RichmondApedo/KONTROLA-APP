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


// --- CENTRALIZED KNOWLEDGE BASE ---
// This object now serves as the single source of truth for static information.
const knowledgeBase = {
  "income-expense": {
    description: "Explain that users can manually add all their income and expenses, categorize them, and set dates. For expenses, they can even use the 'Suggest Category with AI' button to get smart suggestions. This feature is located on the 'Income' and 'Expenses' pages."
  },
  "account-sync": {
    description: "Describe how users can securely link their bank or mobile money accounts in read-only mode via our partner, Mono. This automatically syncs their transaction history, saving them from manual entry. Emphasize that it's secure and we never see their login credentials. This is available in 'Settings' under 'Connect Mobile Money / Bank'."
  },
  "budgets-goals": {
    description: "This is a **Premium** feature. Get excited about it! Explain that budgeting is a powerful step towards financial control. Users can set spending limits for categories to see where their money is going. Similarly, setting savings goals keeps them motivated. Frame this as a key benefit of upgrading and suggest they visit the 'Pricing' page to unlock it. The features are on the 'Budgets & Planning' and 'Savings Goals' pages."
  },
  "bill-tracking": {
    description: "This is a **Premium** feature, located on the 'Bills' page. Explain that with the bill tracker, they'll never miss a payment again. They can track all their upcoming and recurring bills in one place and even get push notification reminders. Highlight how this prevents late fees and provides peace of mind. Encourage them to upgrade from the 'Pricing' page."
  },
  "reports-analytics": {
    description: "Explain that all users can view interactive charts and analyze their financial data on the 'Reports' page. However, the ability to export detailed reports to **PDF and Excel** is a powerful **Premium** feature, perfect for record-keeping or sharing with a financial advisor."
  },
  "business-suite": {
    description: "This is an exclusive **Pro Plus** feature, found on the 'Business' dashboard tab. Explain that the Business Suite is a complete toolkit for entrepreneurs. They can manage customers in a simple CRM, create and send professional invoices, and generate payment receipts, all from within KONTROLA. It’s perfect for separating business and personal finances."
  },
  "ai-advisor": {
    description: "Explain that the 'AI Advisor' page provides free, personalized insights into their spending habits. For a deeper analysis, **Advanced AI Forecasting** is an exclusive **Pro Plus** feature, available on the 'Admin' page. Describe it as having a financial analyst in their pocket, helping them model long-term scenarios and make smarter decisions."
  },
  "kontrola-score": {
    description: "Describe the Kontrola Score on the 'Kontrola Score' page as their personal financial health rating. It's calculated based on their savings, spending, income consistency, and goal achievement. It's a great way to track their financial journey and see how their habits impact their overall standing."
  },
  "pricing-upgrade": {
      description: `Explain the pricing clearly. Premium costs ${formatCurrency(SUBSCRIPTION_PLANS.PREMIUM.price / 100, SUBSCRIPTION_PLANS.PREMIUM.currency)} per month and unlocks budgeting, goals, and bill tracking. Pro Plus costs ${formatCurrency(SUBSCRIPTION_PLANS.PRO_PLUS.price / 100, SUBSCRIPTION_PLANS.PRO_PLUS.currency)} per month and adds the full Business Suite and Advanced AI Forecasting. Users can upgrade anytime from the 'Pricing' page.`
  }
};

// --- TOOLS ---

// Tool to get information about a specific app feature or topic.
const getInformation = ai.defineTool(
  {
    name: 'getInformation',
    description: 'Retrieves detailed information about a specific KONTROLA app feature, pricing, or concept. Use this for "how-to" questions or questions about features and pricing.',
    inputSchema: z.object({
      topic: z.enum(Object.keys(knowledgeBase) as [string, ...string[]]).describe("The key of the topic to get information about."),
    }),
    outputSchema: z.string(),
  },
  async ({ topic }) => {
    return knowledgeBase[topic as keyof typeof knowledgeBase].description;
  }
);

// Tool to analyze user spending for the current month.
const analyzeUserSpending = ai.defineTool(
    {
        name: 'analyzeUserSpending',
        description: "Analyzes the user's income and expenses for the current month. Use this when the user asks to 'analyze spending' or for a 'financial summary'.",
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

        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const endOfCurrentMonth = endOfMonth(now);

        const incomeSnapshot = await firestore.collection(`users/${userId}/incomeSources`)
            .where('date', '>=', startOfCurrentMonth)
            .where('date', '<=', endOfCurrentMonth)
            .get();

        const expensesSnapshot = await firestore.collection(`users/${userId}/expenses`)
            .where('date', '>=', startOfCurrentMonth)
            .where('date', '<=', endOfCurrentMonth)
            .get();

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
        if (foodExpenses > 300) {
            advice.push(`You've spent more than ${formatCurrency(300, currency)} on food this month. Consider reducing takeout meals.`);
        }
        if (totalExpenses > totalIncome) {
            advice.push("⚠️ Warning: Your spending has exceeded your income for this month.");
        }
        if (advice.length === 0) {
            advice.push("Your spending looks balanced for this month. Keep it up!");
        }

        return `
📊 **Financial Summary for This Month**

- **Total Income:** ${formatCurrency(totalIncome, currency)}
- **Total Expenses:** ${formatCurrency(totalExpenses, currency)}

**Advice:**
${advice.join("\n")}
`;
    }
);


// --- MAIN FLOW & PROMPT ---

export async function askKontrola(
  input: AskKontrolaInput
): Promise<AskKontrolaOutput> {
  return askKontrolaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'askKontrolaPrompt',
  input: { schema: AskKontrolaInputSchema },
  output: { schema: AskKontrolaOutputSchema },
  model: 'googleai/gemini-1.5-flash',
  tools: [getInformation, analyzeUserSpending],
  system: `You are "Ask", a friendly and helpful AI support assistant for the KONTROLA financial management app. Your goal is to provide instant, clear, and detailed help by intelligently using the tools at your disposal.

**Guiding Principles:**
- **Prioritize Tools:** Always consider using your available tools first to provide the most accurate and specific answer.
  - Use \`getInformation\` for "how-to" questions, or for questions about app features, concepts like the Kontrola Score, and pricing/upgrades.
  - Use \`analyzeUserSpending\` when the user asks for a financial summary or analysis of their spending. This requires a \`userId\`.
- **Be Generative:** If no tool perfectly fits the user's question, use your general knowledge to formulate a helpful response about financial management in the context of the KONTROLA app.
- **Tone & Style:** Maintain an encouraging and empowering tone. Frame answers to highlight the benefits of using KONTROLA. Your response must be a JSON object with a single key "answer", formatted in clear markdown.
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
