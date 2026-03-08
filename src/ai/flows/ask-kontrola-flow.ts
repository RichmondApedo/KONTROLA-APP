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

// --- DATABASE OF APP FEATURES ---
const featureDatabase = {
  "income-expense": {
    keywords: ["add income", "track expense", "log payment", "new transaction"],
    description: "Explain that users can manually add all their income and expenses, categorize them, and set dates. For expenses, they can even use the 'Suggest Category with AI' button to get smart suggestions. This feature is located on the 'Income' and 'Expenses' pages."
  },
  "account-sync": {
    keywords: ["connect bank", "link account", "sync transactions", "automatic"],
    description: "Describe how users can securely link their bank or mobile money accounts in read-only mode via our partner, Mono. This automatically syncs their transaction history, saving them from manual entry. Emphasize that it's secure and we never see their login credentials. This is available in 'Settings' under 'Connect Mobile Money / Bank'."
  },
  "budgets-goals": {
    keywords: ["create budget", "set limit", "savings goal", "track savings"],
    description: "This is a **Premium** feature. Get excited about it! Explain that budgeting is a powerful step towards financial control. Users can set spending limits for categories to see where their money is going. Similarly, setting savings goals keeps them motivated. Frame this as a key benefit of upgrading and suggest they visit the 'Pricing' page to unlock it. The features are on the 'Budgets & Planning' and 'Savings Goals' pages."
  },
  "bill-tracking": {
    keywords: ["track bills", "bill reminders", "upcoming payment"],
    description: "This is a **Premium** feature, located on the 'Bills' page. Explain that with the bill tracker, they'll never miss a payment again. They can track all their upcoming and recurring bills in one place and even get push notification reminders. Highlight how this prevents late fees and provides peace of mind. Encourage them to upgrade from the 'Pricing' page."
  },
  "reports-analytics": {
    keywords: ["view report", "download report", "export excel", "pdf statement"],
    description: "Explain that all users can view interactive charts and analyze their financial data on the 'Reports' page. However, the ability to export detailed reports to **PDF and Excel** is a powerful **Premium** feature, perfect for record-keeping or sharing with a financial advisor."
  },
  "business-suite": {
    keywords: ["business account", "customers", "invoicing", "receipts", "crm"],
    description: "This is an exclusive **Pro Plus** feature, found on the 'Business' dashboard tab. Explain that the Business Suite is a complete toolkit for entrepreneurs. They can manage customers in a simple CRM, create and send professional invoices, and generate payment receipts, all from within KONTROLA. It’s perfect for separating business and personal finances."
  },
  "ai-advisor": {
    keywords: ["financial advice", "AI advisor", "forecast", "projections"],
    description: "Explain that the 'AI Advisor' page provides free, personalized insights into their spending habits. For a deeper analysis, **Advanced AI Forecasting** is an exclusive **Pro Plus** feature, available on the 'Admin' page. Describe it as having a financial analyst in their pocket, helping them model long-term scenarios and make smarter decisions."
  },
  "kontrola-score": {
    keywords: ["my score", "financial score", "health score", "kontrola score"],
    description: "Describe the Kontrola Score on the 'Kontrola Score' page as their personal financial health rating. It's calculated based on their savings, spending, income consistency, and goal achievement. It's a great way to track their financial journey and see how their habits impact their overall standing."
  }
};

// --- TOOLS ---

// Tool to get information about a specific app feature.
const getFeatureInformation = ai.defineTool(
  {
    name: 'getFeatureInformation',
    description: 'Retrieves detailed information about a specific KONTROLA app feature. Use this for questions about "how to" do something in the app.',
    inputSchema: z.object({
      feature: z.enum(Object.keys(featureDatabase) as [string, ...string[]]).describe("The key of the feature to get information about."),
    }),
    outputSchema: z.string(),
  },
  async ({ feature }) => {
    return featureDatabase[feature as keyof typeof featureDatabase].description;
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


// Tool to query the simple, keyword-based knowledge base.
const queryKnowledgeBase = ai.defineTool(
    {
        name: 'queryKnowledgeBase',
        description: 'Searches a simple, pre-defined knowledge base for direct answers to common questions. Check this first for quick answers.',
        inputSchema: z.object({
            userQuestion: z.string().describe("The user's original question."),
        }),
        outputSchema: z.string().nullable(),
    },
    async ({ userQuestion }) => {
        const { firestore } = initializeFirebase();
        if (!firestore) {
            return null;
        }

        const snapshot = await firestore.collection("chatbot_knowledge").get();
        const text = userQuestion.toLowerCase();

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const questionKeyword = data.question?.toLowerCase();
            // The stored 'question' is a keyword. Check if the user's message includes it.
            if (questionKeyword && text.includes(questionKeyword)) {
                return data.answer;
            }
        }

        return null;
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
  model: 'gemini-1.5-flash',
  tools: [getFeatureInformation, analyzeUserSpending, queryKnowledgeBase],
  system: `You are "Ask", a friendly and helpful AI support assistant for the KONTROLA financial management app. Your goal is to provide instant, clear, and detailed help to users.

Your process is as follows:
1.  First, always use the \`queryKnowledgeBase\` tool to check for a simple, predefined answer. If it returns an answer, use it.
2.  If the knowledge base has no answer, consider the user's question. 
    - If they ask to "analyze spending" or for a "financial summary", use the \`analyzeUserSpending\` tool. This tool requires a userId, so only use it if a userId is provided.
    - If they ask "how to" do something or about a specific app feature, use the \`getFeatureInformation\` tool.
3.  If no tool is suitable, answer the question based on your general knowledge of financial apps.
4.  Always adopt an encouraging and empowering tone. Frame your answers to highlight the value and benefits of using KONTROLA.
5.  If a user needs further human assistance, provide them with the following contact information:
    - Support Email: support@kontrolaapp.com
    - Support Line: +233 501705890
6.  If the question is outside the scope of the KONTROLA app, politely state that you can only help with app-related queries.
7.  Your response must be a JSON object with a single key "answer".
8.  Respond in well-formatted markdown.`,
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
    // The new flow is much simpler: just call the LLM prompt and let it use the tools.
    // The complex logic is now handled by the LLM and its instructions.
    const { output } = await prompt(input);
    return output || { answer: "I'm sorry, I couldn't find an answer to that. You can ask me about budgeting, spending analysis, or Kontrola features." };
  }
);
