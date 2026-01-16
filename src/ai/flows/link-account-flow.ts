'use server';
/**
 * @fileOverview A flow to handle linking a financial account via Mono.
 *
 * - exchangeTokenForAccount - Exchanges a public token from Mono for an account ID and saves it.
 * - ExchangeTokenInput - The input type for the function.
 * - ExchangeTokenOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { doc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/server';

const { firestore } = initializeFirebase();

const ExchangeTokenInputSchema = z.object({
  publicToken: z.string().describe('The temporary public token from the Mono Connect widget.'),
  userId: z.string().describe("The user's unique ID."),
});
export type ExchangeTokenInput = z.infer<typeof ExchangeTokenInputSchema>;

const ExchangeTokenOutputSchema = z.object({
  success: z.boolean().describe('Whether the account was linked successfully.'),
  message: z.string().describe('A message indicating the result.'),
});
export type ExchangeTokenOutput = z.infer<typeof ExchangeTokenOutputSchema>;


const exchangeMonoToken = ai.defineTool(
    {
        name: 'exchangeMonoToken',
        description: 'Exchanges a temporary public token from Mono for a permanent account ID.',
        inputSchema: z.object({ publicToken: z.string() }),
        outputSchema: z.object({
            success: z.boolean(),
            accountId: z.string().optional(),
            error: z.string().optional(),
        }),
    },
    async ({ publicToken }) => {
        const secretKey = process.env.MONO_SECRET_KEY;
        if (!secretKey || secretKey === 'your_mono_secret_key_here') {
            console.error('Mono secret key not configured.');
            // For this prototype, we'll simulate a successful exchange.
            // In a real app, this would return an error.
            return { success: true, accountId: `simulated_${publicToken}` };
        }

        try {
            const response = await fetch('https://api.withmono.com/account/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'mono-sec-key': secretKey,
                },
                body: JSON.stringify({ code: publicToken }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                return { success: false, error: data.message || 'Failed to exchange Mono token.' };
            }

            return { success: true, accountId: data.id };
        } catch (error) {
            console.error('Mono token exchange request failed:', error);
            return { success: false, error: 'Failed to connect to account provider.' };
        }
    }
);


const saveLinkedAccount = ai.defineTool(
    {
        name: 'saveLinkedAccount',
        description: "Saves the user's newly linked financial account to Firestore.",
        inputSchema: z.object({
            userId: z.string(),
            accountId: z.string(),
        }),
        outputSchema: z.object({ success: z.boolean() }),
    },
    async ({ userId, accountId }) => {
        try {
            // In a real app, you would fetch account details from Mono using the accountId
            // and save them. Here, we'll save a placeholder.
            const accountData = {
                id: accountId,
                userId: userId,
                institution: {
                    name: "Simulated Bank",
                    logo: "https://placehold.co/100x100/png"
                },
                accountNumber: "******1234",
                accountName: "John Doe",
                balance: Math.random() * 10000,
                currency: "NGN",
                linkedAt: serverTimestamp(),
            };

            const linkedAccountsCollection = collection(firestore, 'users', userId, 'linkedAccounts');
            await addDoc(linkedAccountsCollection, accountData);

            return { success: true };
        } catch (error) {
            console.error('Firestore save linked account failed:', error);
            return { success: false };
        }
    }
);


export const linkAccountFlow = ai.defineFlow(
    {
        name: 'linkAccountFlow',
        inputSchema: ExchangeTokenInputSchema,
        outputSchema: ExchangeTokenOutputSchema,
        system: "You are an account linking agent. Your role is to take a public token from a user, exchange it for a permanent account ID with the provider, and then save this new account information to the user's profile in the database.",
        tools: [exchangeMonoToken, saveLinkedAccount],
    },
    async (input) => {
       const exchangeResult = await exchangeMonoToken({ publicToken: input.publicToken });

       if (!exchangeResult.success || !exchangeResult.accountId) {
            return { success: false, message: exchangeResult.error || 'Account linking failed.' };
       }

       const saveResult = await saveLinkedAccount({ userId: input.userId, accountId: exchangeResult.accountId });
       
       if (!saveResult.success) {
            return { success: false, message: 'Account linked, but failed to save details. Please contact support.' };
       }

       return { success: true, message: 'Account linked successfully.' };
    }
);

export async function exchangeTokenForAccount(input: ExchangeTokenInput): Promise<ExchangeTokenOutput> {
    return linkAccountFlow(input);
}
