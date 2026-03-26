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
import type { WriteBatch } from 'firebase-admin/firestore'; 

// Helper to chunk an array into smaller pieces
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// Helper to process items in parallel with a concurrency limit
async function processWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const chunks = chunkArray(items, concurrency);
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

const SyncAccountInputSchema = z.object({
  accountId: z.string().describe('The unique ID of the linked account from Mono.'),
  userId: z.string().describe("The user's unique ID."),
});
export type SyncAccountInput = z.infer<typeof SyncAccountInputSchema>;

const SyncAccountOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  syncedCount: z.number().optional(),
  categorizedCount: z.number().optional(),
  fallbackCount: z.number().optional(),
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

  const profileDoc = await firestore.collection('users').doc(userId).collection('profile').doc(userId).get();
  const userPlan = profileDoc.data()?.plan || 'free';
  const hasAIAccess = userPlan === 'premium' || userPlan === 'pro-plus';

  let categorizedCount = 0;
  let fallbackCount = 0;

  // Process categorizations with a concurrency limit to avoid hitting AI rate limits
  // We'll process 10 transactions at a time
  console.log(`Starting AI categorization for ${transactions.length} transactions...`);
  await processWithConcurrency(transactions, 10, async (tx) => {
    try {
      if (tx.type === 'debit') {
        let category = 'Other';
        if (tx.narration && hasAIAccess) {
          try {
            const suggestion = await autoCategorizeExpense({ description: tx.narration });
            category = suggestion.category;
            categorizedCount++;
          } catch (e) {
            console.error(`AI categorization failed for debit '${tx.narration}':`, e);
            fallbackCount++;
          }
        } else {
          fallbackCount++;
        }
        tx.aiCategory = category;
      } else if (tx.type === 'credit') {
        let category = 'Other Income';
        if (tx.narration && hasAIAccess) {
          try {
            const suggestion = await autoCategorizeIncome({ description: tx.narration });
            category = suggestion.category;
            categorizedCount++;
          } catch (e) {
            console.error(`AI categorization failed for credit '${tx.narration}':`, e);
            fallbackCount++;
          }
        } else {
          fallbackCount++;
        }
        tx.aiCategory = category;
      }
    } catch (err) {
      console.error(`Unexpected error processing transaction ${tx._id}:`, err);
      fallbackCount++;
    }
  });

  // Chunk transactions for Firestore batches (max 500 per batch)
  // We'll use 400 to be safe
  const transactionChunks = chunkArray(transactions, 400);
  let totalSynced = 0;

  for (const chunk of transactionChunks) {
    const batch = firestore.batch() as WriteBatch;
    for (const tx of chunk) {
      if (tx.type === 'debit') {
        const expenseRef = firestore.collection('users').doc(userId).collection('expenses').doc(tx._id);
        const expenseData = {
          userId: userId,
          amount: tx.amount / 100,
          currency: tx.currency,
          date: new Date(tx.date),
          category: tx.aiCategory || 'Other',
          description: tx.narration || 'Unspecified Expense',
          context: 'personal' as 'personal' | 'business',
        };
        batch.set(expenseRef, expenseData, { merge: true });
      } else if (tx.type === 'credit') {
        const incomeRef = firestore.collection('users').doc(userId).collection('incomeSources').doc(tx._id);
        const incomeData = {
          userId: userId,
          name: tx.narration || 'Unspecified Income',
          amount: tx.amount / 100,
          currency: tx.currency,
          date: new Date(tx.date),
          category: tx.aiCategory || 'Other Income',
          context: 'personal' as 'personal' | 'business',
        };
        batch.set(incomeRef, incomeData, { merge: true });
      }
    }
    await batch.commit();
    totalSynced += chunk.length;
    console.log(`Committed batch of ${chunk.length} transactions. Total synced: ${totalSynced}`);
  }

  return { 
    success: true, 
    message: `Successfully synced ${totalSynced} transactions. AI Categorized: ${categorizedCount}, Fallbacks: ${fallbackCount}.`, 
    syncedCount: totalSynced,
    categorizedCount,
    fallbackCount
  };
}
