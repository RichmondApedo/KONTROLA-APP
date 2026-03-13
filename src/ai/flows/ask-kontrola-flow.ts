'use server';
/**
 * @fileOverview An AI flow for answering user questions about the Kontrola app.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define schemas for financial data types to be passed to the prompt
const UserProfileSchema = z.object({
    firstName: z.string().optional(),
    plan: z.string(),
    preferredCurrency: z.string(),
});

// The main input schema for the flow
export const askKontrolaSchema = z.object({
    question: z.string().describe("The user's question."),
    currentDate: z.string().describe("The current date, to provide context to the AI."),
    profile: UserProfileSchema.describe("The user's profile information."),
});

export type AskKontrolaInput = z.infer<typeof askKontrolaSchema>;


export const AskKontrolaOutputSchema = z.object({
  answer: z.string().describe("A clear, concise, and helpful response to the user's question, formatted in Markdown."),
});
export type AskKontrolaOutput = z.infer<typeof AskKontrolaOutputSchema>;


const prompt = ai.definePrompt({
  name: 'askKontrolaPrompt',
  input: { schema: askKontrolaSchema },
  output: { schema: AskKontrolaOutputSchema },
  prompt: `You are Ask, an expert AI assistant for the KONTROLA financial management application.
Your goal is to answer user questions about how to use the app.
You CANNOT see the user's financial data. If the user asks for a summary or analysis of their finances, politely explain that you cannot access their data but can guide them to the right page in the app (like Dashboard or Reports).
Today's date is {{{currentDate}}}. The user's name is {{{profile.firstName}}}.

User's Question:
"{{{question}}}"

Please provide your response in the 'answer' field of the structured output.
`,
});

const generateAnswerFlow = ai.defineFlow(
  {
    name: 'askKontrolaFlow',
    inputSchema: askKontrolaSchema,
    outputSchema: AskKontrolaOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The AI model did not return a valid response.');
    }
    return output;
  }
);

export async function askKontrolaFlow(input: AskKontrolaInput): Promise<AskKontrolaOutput> {
    return generateAnswerFlow(input);
}
