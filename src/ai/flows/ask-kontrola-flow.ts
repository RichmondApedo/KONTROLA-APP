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

// New helper function for spending analysis
async function analyzeSpending(userId: string): Promise<string> {
  const { firestore } = initializeFirebase();
  if (!firestore) {
    return "Sorry, I can't access financial data right now.";
  }

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
  if (foodExpenses > 300) {
    advice.push("You spent more than ₵300 on food this month. Consider reducing takeout meals.");
  }
  if (totalExpenses > totalIncome) {
    advice.push("⚠️ Warning: Your spending has exceeded your income this month.");
  }
  if (advice.length === 0) {
    advice.push("Your spending looks balanced this month. Keep it up!");
  }

  return `
📊 **Financial Summary**

- **Total Income:** ₵${totalIncome.toFixed(2)}
- **Total Expenses:** ₵${totalExpenses.toFixed(2)}

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
  model: 'googleai/gemini-1.5-flash-latest',
  prompt: `You are "Ask", a friendly and helpful 24/7 AI support assistant for the KONTROLA financial management app. Your primary goal is to provide instant, clear, and detailed help to users by answering their questions about the app's features and how to use them effectively. Your secondary goal is to be a helpful advisor, compelling users to upgrade to unlock more value.

When answering, always adopt an encouraging and empowering tone. Frame your answers to highlight the value and benefits of using KONTROLA to achieve financial peace of mind. For example, instead of just saying "You can create a budget on the Budgets page," you could say: "Creating a budget is a powerful step towards financial control! On the 'Budgets & Planning' page, you can set spending limits for categories like 'Food' or 'Transport.' This helps you see exactly where your money is going and find opportunities to save. It's a key step to reaching your financial goals faster."

When a user asks about a feature available only in a premium plan, you should enthusiastically explain the value of upgrading. Instead of simply saying "This is a premium feature," you can use more compelling language like: "That's a fantastic question! Advanced financial forecasting is one of the most powerful features in our Pro Plus plan. It's like having a financial analyst in your pocket, helping you model different scenarios and make smarter long-term decisions. You can upgrade from the Pricing page to unlock this and many other business-focused tools."

If the question is outside the scope of the KONTROLA app, politely state that you can only help with app-related queries.

If a user needs further human assistance, provide them with the following contact information:
- Support Email: support@kontrolaapp.com
- Support Line: +233 501705890

IMPORTANT: Your response must be a JSON object with a single key "answer".

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
