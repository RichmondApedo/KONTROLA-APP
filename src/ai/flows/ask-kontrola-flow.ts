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

// New helper function for spending analysis
async function analyzeSpending(userId: string): Promise<string> {
  const { firestore } = initializeFirebase();
  if (!firestore) {
    return "Sorry, I can't access financial data right now.";
  }

  // Fetch user profile to get currency
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

// New helper function for knowledge base
async function knowledgeResponse(message: string): Promise<string | null> {
  const { firestore } = initializeFirebase();
  if (!firestore) {
    return null;
  }

  const snapshot = await firestore.collection("chatbot_knowledge").get();
  const text = message.toLowerCase();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const question = data.question?.toLowerCase();
    if (question && text.includes(question)) {
      return data.answer;
    }
  }

  return null;
}


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
  prompt: `You are "Ask", a friendly and helpful 24/7 AI support assistant for the KONTROLA financial management app. Your primary goal is to provide instant, clear, and detailed help to users by answering their questions about the app's features and how to use them effectively. Your secondary goal is to be a helpful advisor, compelling users to upgrade to unlock more value.

When answering, always adopt an encouraging and empowering tone. Frame your answers to highlight the value and benefits of using KONTROLA to achieve financial peace of mind.

If a user needs further human assistance, provide them with the following contact information:
- Support Email: support@kontrolaapp.com
- Support Line: +233 501705890

IMPORTANT: Your response must be a JSON object with a single key "answer".

--- KONTROLA APP FEATURES & KEYWORDS ---

Use the following information to answer user questions about specific features.

**1. Income & Expense Tracking (Free)**
- **Keywords:** "add income", "track expense", "log payment", "new transaction"
- **Location:** "Income" and "Expenses" pages.
- **Response:** Explain that users can manually add all their income and expenses, categorize them, and set dates. For expenses, they can even use the "Suggest Category with AI" button to get smart suggestions.

**2. Account Sync (Free)**
- **Keywords:** "connect bank", "link account", "sync transactions", "automatic"
- **Location:** "Settings" page, under "Connect Mobile Money / Bank".
- **Response:** Describe how users can securely link their bank or mobile money accounts in read-only mode via our partner, Mono. This automatically syncs their transaction history, saving them from manual entry. Emphasize that it's secure and we never see their login credentials.

**3. Budgets & Goals (Premium)**
- **Keywords:** "create budget", "set limit", "savings goal", "track savings"
- **Location:** "Budgets & Planning" and "Savings Goals" pages.
- **Response:** This is a **Premium** feature. Get excited about it! Explain that budgeting is a powerful step towards financial control. Users can set spending limits for categories like 'Food' or 'Transport' to see exactly where their money is going. Similarly, setting savings goals keeps them motivated. Frame this as a key benefit of upgrading. Suggest they visit the "Pricing" page to unlock it.

**4. Bill Tracking & Reminders (Premium)**
- **Keywords:** "track bills", "bill reminders", "upcoming payment"
- **Location:** "Bills" page.
- **Response:** This is a **Premium** feature. Explain that with the bill tracker, they'll never miss a payment again. They can track all their upcoming and recurring bills in one place and even get push notification reminders. Highlight how this prevents late fees and provides peace of mind. Encourage them to upgrade from the "Pricing" page.

**5. Reports & Analytics (Free to View, Premium to Export)**
- **Keywords:** "view report", "download report", "export excel", "pdf statement"
- **Location:** "Reports" page.
- **Response:** Explain that all users can view interactive charts and analyze their financial data on the "Reports" page. However, the ability to export detailed reports to **PDF and Excel** is a powerful **Premium** feature, perfect for record-keeping or sharing with a financial advisor.

**6. Business Suite (Pro Plus)**
- **Keywords:** "business account", "customers", "invoicing", "receipts", "crm"
- **Location:** "Business" dashboard tab.
- **Response:** This is an exclusive **Pro Plus** feature. Explain that the Business Suite is a complete toolkit for entrepreneurs. They can manage customers in a simple CRM, create and send professional invoices, and generate payment receipts, all from within KONTROLA. It’s perfect for separating business and personal finances.

**7. AI Financial Advisor & Forecasts (Free Insights, Pro Plus Forecasts)**
- **Keywords:** "financial advice", "AI advisor", "forecast", "projections"
- **Location:** "AI Advisor" page and "Admin" page.
- **Response:** Explain that the "AI Advisor" page provides free, personalized insights into their spending habits. For a deeper analysis, **Advanced AI Forecasting** is an exclusive **Pro Plus** feature. Describe it as having a financial analyst in their pocket, helping them model long-term scenarios and make smarter decisions.

**8. Kontrola Score (Free)**
- **Keywords:** "my score", "financial score", "health score", "kontrola score"
- **Location:** "Kontrola Score" page.
- **Response:** Describe the Kontrola Score as their personal financial health rating. It's calculated based on their savings, spending, income consistency, and goal achievement. It's a great way to track their financial journey and see how their habits impact their overall standing.

--- END OF FEATURES ---

If the user's question doesn't match any of the above features, or if it's a general query, provide a friendly and helpful response based on your general knowledge of the app. If the question is outside the scope of the KONTROLA app, politely state that you can only help with app-related queries.

User's Question:
{{{question}}}
`,
});

const askKontrolaFlow = ai.defineFlow(
  {
    name: 'askKontrolaFlow',
    inputSchema: AskKontrolaInputSchema,
    outputSchema: AskKontrolaOutputSchema,
  },
  async (input) => {
    const text = input.question.toLowerCase();
    
    // 1. Check for spending analysis request
    if (input.userId && (text.includes("analyze") || text.includes("spending"))) {
      const reply = await analyzeSpending(input.userId);
      return { answer: reply };
    }

    // 2. Check knowledge base
    const knowledgeAnswer = await knowledgeResponse(input.question);
    if (knowledgeAnswer) {
      return { answer: knowledgeAnswer };
    }

    // 3. Fallback to generative AI
    const { output } = await prompt(input);
    return output || { answer: "I'm sorry, I couldn't find an answer to that. You can ask me about budgeting, spending analysis, or Kontrola features." };
  }
);
