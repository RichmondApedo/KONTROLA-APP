import { z } from 'zod';

export const AskKontrolaInputSchema = z.object({
  question: z.string().describe("The user's question about the app."),
  userId: z.string().optional().describe("The user's ID for personalized queries."),
});
export type AskKontrolaInput = z.infer<typeof AskKontrolaInputSchema>;

export const AskKontrolaOutputSchema = z.object({
  answer: z
    .string()
    .describe('A helpful and friendly answer to the user question.'),
});
export type AskKontrolaOutput = z.infer<typeof AskKontrolaOutputSchema>;
