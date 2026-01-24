'use server';
/**
 * @fileOverview A flow to handle linking a financial account via Mono.
 *
 * - exchangeTokenForAccount - Exchanges a temporary Mono code for a permanent account ID and saves the account details.
 * - ExchangeTokenInput - The input type for the flow.
 * - ExchangeTokenOutput - The output type for the flow.
 */

import { z } from 'zod';
import { initializeFirebase } from '@/firebase/server';
import type { LinkedAccount, Expense, IncomeSource } from '@/lib/types';

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

// This is now a standard Next.js Server Action. It will throw an error on failure.
export async function exchangeTokenForAccount(input: ExchangeTokenInput): Promise<ExchangeTokenOutput> {
  const { firestore } = initializeFirebase();
  if (!firestore) {
    console.error("Account linking failed: Firestore is not initialized on the server. Check server configuration for FIREBASE_SERVICE_ACCOUNT.");
    // Throw an error that the client can display.
    throw new Error("The server's database connection is not configured. Please contact support.");
  }

  let secretKey = process.env.MONO_SECRET_KEY;

  // If the secret key is not set or is the default placeholder, use the secret test key.
  if (!secretKey || secretKey === 'your_mono_secret_key_here') {
    secretKey = 'test_sk_gu0s42h735g290b3'; // Mono's secret test key
  }

  const parsedInput = ExchangeTokenInputSchema.safeParse(input);
  if (!parsedInput.success) {
    console.error("Invalid input for exchangeTokenForAccount:", parsedInput.error);
    throw new Error("Invalid input provided for account linking.");
  }
  const { code, userId } = parsedInput.data;

  // 1. Exchange code for account ID
  const authResponse = await fetch('https://api.withmono.com/account/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'mono-sec-key': secretKey },
    body: JSON.stringify({ code }),
  });

  if (!authResponse.ok) {
    const errorData = await authResponse.json().catch(() => ({ message: 'Failed to parse Mono error response.' }));
    console.error("Mono code exchange failed:", errorData);
    throw new Error(`Mono code exchange failed: ${errorData.message || authResponse.statusText}`);
  }
  const { id: accountId } = await authResponse.json();

  // 2. Fetch account details
  const detailsResponse = await fetch(`https://api.withmono.com/accounts/${accountId}`, {
    headers: { 'Content-Type': 'application/json', 'mono-sec-key': secretKey },
  });

  if (!detailsResponse.ok) {
    const errorData = await detailsResponse.json().catch(() => ({ message: 'Failed to parse Mono error response.' }));
    console.error("Failed to fetch account details from Mono:", errorData);
    throw new Error(`Failed to fetch account details from Mono: ${errorData.message || detailsResponse.statusText}`);
  }
  const accountDetails = await detailsResponse.json();

  // 3. Save to Firestore
  const accountRef = firestore.collection('users').doc(userId).collection('linkedAccounts').doc(accountDetails._id);
  const accountData: Omit<LinkedAccount, 'id'> = {
      userId: userId,
      institutionName: accountDetails.institution.name,
      accountName: accountDetails.name,
      accountNumber: accountDetails.accountNumber,
      accountType: accountDetails.type,
      balance: accountDetails.balance, // This is in kobo/cents
      currency: accountDetails.currency,
  };
  await accountRef.set(accountData);

  // 4. Fetch and save transactions
  const transactionsResponse = await fetch(`https://api.withmono.com/accounts/${accountId}/transactions?limit=500`, { // Fetch up to 500 recent transactions
    headers: { 'Content-Type': 'application/json', 'mono-sec-key': secretKey },
  });

  if (transactionsResponse.ok) {
    const { data: transactions } = await transactionsResponse.json();
    if (transactions && Array.isArray(transactions) && transactions.length > 0) {
        const batch = firestore.batch();

        transactions.forEach((tx: any) => {
            if (tx.type === 'debit') {
                const expenseRef = firestore.collection('users').doc(userId).collection('expenses').doc();
                const expenseData = {
                    userId: userId,
                    amount: tx.amount / 100, // Convert from kobo/cents
                    currency: tx.currency,
                    date: new Date(tx.date),
                    category: tx.category || 'Bank Transaction',
                    description: tx.narration,
                    context: 'personal' as 'personal' | 'business',
                };
                batch.set(expenseRef, expenseData);
            } else if (tx.type === 'credit') {
                const incomeRef = firestore.collection('users').doc(userId).collection('incomeSources').doc();
                 const incomeData = {
                    userId: userId,
                    name: tx.narration,
                    amount: tx.amount / 100,
                    currency: tx.currency,
                    date: new Date(tx.date),
                    category: tx.category || 'Bank Transaction',
                    context: 'personal' as 'personal' | 'business',
                };
                batch.set(incomeRef, incomeData);
            }
        });
        
        await batch.commit();
        
        return { success: true, message: `Account linked and ${transactions.length} transactions synced successfully!`, accountId };
    }
  } else {
      console.warn(`Could not fetch transactions for account ${accountId}. Linking continued without transaction history.`);
  }

  return { success: true, message: 'Account linked successfully!', accountId };
}
