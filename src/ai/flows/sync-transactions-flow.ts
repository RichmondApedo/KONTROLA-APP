'use server';
/**
 * @fileOverview A flow to manually synchronize transactions for a linked financial account.
 *
 * - syncAccountTransactions - Fetches the latest transactions from Mono and upserts them into Firestore.
 * - SyncAccountInput - The input type for the flow.
 * - SyncAccountOutput - The output type for the flow.
 */

import { z } from 'zod';
import { initializeFirebase } from '@/firebase/server';
import { autoCategorizeExpense } from './auto-categorize-expense';
import { autoCategorizeIncome } from './auto-categorize-income';

const SyncAccountInputSchema = z.object({
  accountId: z.string().describe('The unique ID of the linked account from Mono.'),
  userId: z.string().describe("The user's unique ID."),
});
export type SyncAccountInput = z.infer<typeof SyncAccountInputSchema>;

const SyncAccountOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  syncedCount: z.number().optional(),
});
export type SyncAccountOutput = z.infer<typeof SyncAccountOutputSchema>;

export async function syncAccountTransactions(input: SyncAccountInput): Promise<SyncAccountOutput> {
  const { firestore } = initializeFirebase();
  if (!firestore) {
    console.error("Transaction sync failed: Firestore is not initialized on the server.");
    throw new Error("The server's database connection is not configured. Please contact support.");
  }

  const secretKey = process.env.MONO_SECRET_KEY;
  if (!secretKey || secretKey === 'your_mono_secret_key_here') {
    const errorMessage = "Mono secret key is not configured on the server. Account syncing is disabled.";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  const parsedInput = SyncAccountInputSchema.safeParse(input);
  if (!parsedInput.success) {
    console.error("Invalid input for syncAccountTransactions:", parsedInput.error);
    throw new Error("Invalid input provided for transaction synchronization.");
  }
  const { accountId, userId } = parsedInput.data;

  // Fetch transactions from Mono
  const transactionsResponse = await fetch(`https://api.withmono.com/accounts/${accountId}/transactions?limit=500`, {
    headers: { 'Content-Type': 'application/json', 'mono-sec-key': secretKey },
  });

  if (!transactionsResponse.ok) {
    const errorData = await transactionsResponse.json().catch(() => ({ message: 'Failed to parse Mono error response.' }));
    console.error(`Could not fetch transactions for account ${accountId}:`, errorData);
    throw new Error(`Could not fetch transactions: ${errorData.message || 'Please try again later.'}`);
  }

  const { data: transactions } = await transactionsResponse.json();
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return { success: true, message: 'No new transactions to sync.', syncedCount: 0 };
  }

  const batch = firestore.batch();

  // Process all categorizations in parallel for performance.
  const categorizationPromises = transactions.map(async (tx) => {
    // Use the unique transaction ID from Mono as the Firestore document ID for idempotency
    if (tx.type === 'debit') {
      let category = 'Other';
      if (tx.narration) {
        try {
          const suggestion = await autoCategorizeExpense({ description: tx.narration });
          category = suggestion.category;
        } catch (e) {
          console.error(`AI categorization failed for '${tx.narration}', falling back.`, e);
          category = 'Other'; // Fallback category
        }
      }

      const expenseRef = firestore.collection('users').doc(userId).collection('expenses').doc(tx._id);
      const expenseData = {
        userId: userId,
        amount: tx.amount / 100, // Convert from kobo/cents
        currency: tx.currency,
        date: new Date(tx.date),
        category: category,
        description: tx.narration,
        context: 'personal' as 'personal' | 'business',
      };
      batch.set(expenseRef, expenseData, { merge: true }); // Use merge:true to be safe
    } else if (tx.type === 'credit') {
      let category = 'Other Income';
       if (tx.narration) {
        try {
          const suggestion = await autoCategorizeIncome({ description: tx.narration });
          category = suggestion.category;
        } catch (e) {
          console.error(`AI income categorization failed for '${tx.narration}', falling back.`, e);
          category = 'Other Income'; // Fallback category
        }
      }

      const incomeRef = firestore.collection('users').doc(userId).collection('incomeSources').doc(tx._id);
      const incomeData = {
        userId: userId,
        name: tx.narration,
        amount: tx.amount / 100,
        currency: tx.currency,
        date: new Date(tx.date),
        category: category,
        context: 'personal' as 'personal' | 'business',
      };
      batch.set(incomeRef, incomeData, { merge: true });
    }
  });

  // Wait for all AI calls to complete before committing the batch.
  await Promise.all(categorizationPromises);
  await batch.commit();

  return { success: true, message: `Successfully synced and auto-categorized ${transactions.length} transactions.`, syncedCount: transactions.length };
}
