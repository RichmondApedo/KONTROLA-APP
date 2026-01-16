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
import { initializeFirebase } from '@/firebase/server';
import type { LinkedAccount } from '@/lib/types';

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

// This single tool handles the entire server-side account linking process.
const linkAndSaveAccountTool = ai.defineTool(
  {
    name: 'linkAndSaveAccount',
    description: 'Exchanges a Mono code, fetches account details, and saves them to Firestore.',
    inputSchema: ExchangeTokenInputSchema,
    outputSchema: ExchangeTokenOutputSchema,
  },
  async ({ code, userId }) => {
    const { firestore } = initializeFirebase();
    if (!firestore) {
        console.error("Account linking tool failed: Firestore is not initialized. Check server configuration for FIREBASE_SERVICE_ACCOUNT.");
        return { success: false, message: "The server's database connection is not configured. Please contact support." };
    }

    let secretKey = process.env.MONO_SECRET_KEY;

    // If the secret key is not set or is the default placeholder, use the secret test key.
    if (!secretKey || secretKey === 'your_mono_secret_key_here') {
        secretKey = 'test_sk_gu0s42h735g290b3'; // Mono's secret test key
    }

    try {
      // 1. Exchange code for account ID
      const authResponse = await fetch('https://api.withmono.com/account/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'mono-sec-key': secretKey },
        body: JSON.stringify({ code }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        throw new Error(`Mono code exchange failed: ${errorData.message || authResponse.statusText}`);
      }
      const { id: accountId } = await authResponse.json();

      // 2. Fetch account details
      const detailsResponse = await fetch(`https://api.withmono.com/accounts/${accountId}`, {
        headers: { 'Content-Type': 'application/json', 'mono-sec-key': secretKey },
      });

      if (!detailsResponse.ok) {
        throw new Error('Failed to fetch account details from Mono.');
      }
      const accountDetails = await detailsResponse.json();

      // 3. Save to Firestore
      const accountRef = firestore.collection('users').doc(userId).collection('linkedAccounts').doc(accountDetails._id);
      const accountData: LinkedAccount = {
          id: accountDetails._id,
          userId: userId,
          institutionName: accountDetails.institution.name,
          accountName: accountDetails.name,
          accountNumber: accountDetails.accountNumber,
          accountType: accountDetails.type,
          balance: accountDetails.balance, // This is in kobo/cents
          currency: accountDetails.currency,
      };
      await accountRef.set(accountData);

      return { success: true, message: 'Account linked successfully!', accountId };
    } catch (e: any) {
      console.error("Account linking tool failed:", e);
      return { success: false, message: e.message || 'An unknown error occurred during account linking.' };
    }
  }
);


// The flow now simply calls the single, consolidated tool.
export const linkAccountFlow = ai.defineFlow(
  {
    name: 'linkAccountFlow',
    inputSchema: ExchangeTokenInputSchema,
    outputSchema: ExchangeTokenOutputSchema,
    system: "You are an account linking agent. Use the available tool to handle the entire account linking process.",
    tools: [linkAndSaveAccountTool],
  },
  async (input) => {
    return await linkAndSaveAccountTool(input);
  }
);


export async function exchangeTokenForAccount(input: ExchangeTokenInput): Promise<ExchangeTokenOutput> {
  return linkAccountFlow(input);
}
