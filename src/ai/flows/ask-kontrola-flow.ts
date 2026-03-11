'use server';
/**
 * @fileOverview An AI flow for answering user questions about the Kontrola app.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { askKontrolaSchema, type AskKontrolaInput } from './schemas/ask-kontrola-schema';
import { format } from 'date-fns';

export { AskKontrolaInput };

const prompt = ai.definePrompt({
  name: 'askKontrolaPrompt',
  input: { schema: askKontrolaSchema },
  prompt: `You are Ask, an expert AI assistant for the KONTROLA financial management application.
Your goal is to answer user questions about their finances or how to use the app, based *only* on the information provided.
Today's date is ${format(new Date(), 'PPP')}.

Analyze the user's financial data and their question to provide a clear, concise, and helpful response.
If the user's question is about how to use the app, provide a simple, step-by-step guide.
If the user asks for a summary or analysis, use the provided data to give them a brief overview.
If the question is unrelated to the app or their finances, politely decline to answer.

START OF FINANCIAL DATA:
---
User Profile:
- Name: {{{profile.firstName}}}
- Plan: {{{profile.plan}}}
- Currency: {{{profile.preferredCurrency}}}
---
Recent Income:
{{#each income}}
- {{name}}: {{amount}} on {{date}}
{{else}}
- No income data provided.
{{/each}}
---
Recent Expenses:
{{#each expenses}}
- {{description}}: {{amount}} on {{date}} (Category: {{category}})
{{else}}
- No expense data provided.
{{/each}}
---
Active Budgets:
{{#each budgets}}
- {{name}}: {{amount}} per {{period}} for {{category}}
{{else}}
- No budget data provided.
{{/each}}
---
Savings Goals:
{{#each savingsGoals}}
- {{name}}: {{currentAmount}} / {{targetAmount}}
{{else}}
- No savings goals provided.
{{/each}}
---
END OF FINANCIAL DATA

User's Question:
"{{{question}}}"
`,
});

const askKontrolaFlow = ai.defineFlow(
  {
    name: 'askKontrolaFlow',
    inputSchema: askKontrolaSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function askKontrola(input: AskKontrolaInput): Promise<string> {
    return askKontrolaFlow(input);
}
