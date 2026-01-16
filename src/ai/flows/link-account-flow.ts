'use server';
/**
 * @fileOverview A flow to handle linking a financial account via Mono.
 *
 * - exchangeTokenForAccount - Exchanges a temporary Mono code for a permanent account ID and saves the account details.
 * - ExchangeTokenInput - The input type for the flow.
 * - ExchangeTokenOutput - The output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { doc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase'; // Using the client-side init, but this runs on the server. OK for this case.

const { firestore } = initializeFirebase();

const ExchangeTokenInputSchema = z.object({
  code: z.string().describe('The temporary public token from Mono Connect.'),
  userId: z.string().describe("The user's unique ID."),
});
export type ExchangeTokenInput = z.infer<typeof ExchangeTokenInputSchema>;

const ExchangeTokenOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  accountId: z.string().optional(),
});
export type ExchangeTokenOutput = z.infer<typeof ExchangeTokenOutputSchema>;

// This tool performs the server-to-server code exchange.
const exchangeMonoCodeTool = ai.defineTool(
  {
    name: 'exchangeMonoCode',
    description: 'Exchanges the temporary code for a permanent account ID from Mono.',
    inputSchema: z.object({ code: z.string() }),
    outputSchema: z.object({ accountId: z.string() }),
  },
  async ({ code }) => {
    const secretKey = process.env.MONO_SECRET_KEY;
    if (!secretKey || secretKey === 'your_mono_secret_key_here') {
      throw new Error('Mono secret key is not configured on the server.');
    }

    const response = await fetch('https://api.withmono.com/account/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mono-sec-key': secretKey,
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Mono code exchange failed: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    return { accountId: data.id };
  }
);

// This tool saves the fetched account details to Firestore.
const saveLinkedAccountTool = ai.defineTool(
    {
        name: 'saveLinkedAccount',
        description: 'Saves the linked account details to Firestore.',
        inputSchema: z.object({
            userId: z.string(),
            account: z.any(),
        }),
        outputSchema: z.object({ success: z.boolean() }),
    },
    async ({ userId, account }) => {
        try {
            const accountRef = doc(firestore, 'users', userId, 'linkedAccounts', account._id);
            const accountData = {
                id: account._id,
                userId: userId,
                institutionName: account.institution.name,
                accountName: account.name,
                accountNumber: account.accountNumber,
                accountType: account.type,
                balance: account.balance,
                currency: account.currency,
            };
            await setDoc(accountRef, accountData);
            return { success: true };
        } catch (error) {
            console.error("Firestore save failed:", error);
            return { success: false };
        }
    }
);

// Define the main flow
export const linkAccountFlow = ai.defineFlow(
  {
    name: 'linkAccountFlow',
    inputSchema: ExchangeTokenInputSchema,
    outputSchema: ExchangeTokenOutputSchema,
    system: "You are an account linking agent. Your job is to take a temporary code from the Mono widget, exchange it for a permanent account ID, and then save the account's details to the user's profile in the database.",
    tools: [exchangeMonoCodeTool, saveLinkedAccountTool],
  },
  async ({ code, userId }) => {
    try {
        const { accountId } = await exchangeMonoCodeTool({ code });

        const secretKey = process.env.MONO_SECRET_KEY;
        const response = await fetch(`https://api.withmono.com/accounts/${accountId}`, {
             headers: {
                'Content-Type': 'application/json',
                'mono-sec-key': secretKey!,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch account details from Mono.');
        }
        const accountDetails = await response.json();


        const saveResult = await saveLinkedAccountTool({ userId, account: accountDetails });

        if (!saveResult.success) {
            return { success: false, message: 'Account linked, but failed to save details to your profile. Please contact support.' };
        }

        return { success: true, message: 'Account linked successfully!', accountId };
    } catch(e: any) {
        return { success: false, message: e.message || 'An unknown error occurred during account linking.' };
    }
  }
);


export async function exchangeTokenForAccount(input: ExchangeTokenInput): Promise<ExchangeTokenOutput> {
  return linkAccountFlow(input);
}
