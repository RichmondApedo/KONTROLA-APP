'use server';
/**
 * @fileOverview A flow to manually synchronize transactions for a linked financial account.
 *
 * - syncAccountTransactions - Fetches the latest transactions from Mono and upserts them into Firestore.
 * - SyncAccountInput - The input type for the flow.
 * - SyncAccountOutput - The output type for the flow.
 *
 * Security: This flow runs server-side only. It reads the account's purpose
 * from Firestore and classifies each transaction accordingly, preventing
 * client-side manipulation of transaction context.
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
  idToken: z.string().describe("Firebase ID token for secure server-side validation."),
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
  const { accountId, userId, idToken } = parsedInput.data;

  // --- SECURITY: Authenticate the requesting user ---
  try {
     const admin = await import('firebase-admin');
     // initializeFirebase already ensures firebaseAdminApp exists, but we need it here
     const { firebaseAdminApp: adminApp } = initializeFirebase();
     if (!adminApp) throw new Error("Admin app not initialized");
     
     const decodedToken = await admin.auth(adminApp).verifyIdToken(idToken);
     if (decodedToken.uid !== userId) {
         throw new Error("Authorization failed: UID mismatch.");
     }
  } catch (err: any) {
     console.error("IDOR Attempt or Auth Failure in Sync:", err.message);
     throw new Error("You are not authorized to sync this account.");
  }

  // --- SECURITY: Read account purpose server-side from Firestore ---
  // This prevents clients from spoofing the accountPurpose to misclassify data.
  const accountSnap = await firestore
    .collection('users').doc(userId).collection('linkedAccounts').doc(accountId).get();
  const accountPurpose: 'personal' | 'business' | 'both' = accountSnap.exists
    ? (accountSnap.data()?.accountPurpose ?? 'personal')
    : 'personal';

  // --- CRM MATCHING: Build known customer identifiers for 'both' accounts ---
  // Loads customer names and phone numbers to enable automatic business transaction detection.
  const customerIdentifiers = new Set<string>();
  if (accountPurpose === 'both') {
    try {
      const customersSnap = await firestore
        .collection('users').doc(userId).collection('customers').get();
      customersSnap.docs.forEach(d => {
        const data = d.data();
        // Index customer phone (digits only) and name (lowercase) for matching against narrations
        if (data.phone) customerIdentifiers.add(data.phone.replace(/\D/g, ''));
        if (data.name) customerIdentifiers.add(data.name.toLowerCase().trim());
      });
    } catch (e) {
      console.warn('CRM matching: could not load customers, defaulting all to personal.', e);
    }
  }

  // Classify a transaction based on its narration and the account's declared purpose
  function classifyTransaction(narration: string): { context: 'personal' | 'business'; needsReview: boolean } {
    // Pure accounts are classified immediately — no review needed
    if (accountPurpose === 'personal') return { context: 'personal', needsReview: false };
    if (accountPurpose === 'business') return { context: 'business', needsReview: false };

    // Mixed account: attempt CRM match against known customer identifiers
    const lowerNarration = narration.toLowerCase();
    let isBusinessTx = false;
    customerIdentifiers.forEach(id => {
      if (lowerNarration.includes(id)) isBusinessTx = true;
    });

    if (isBusinessTx) return { context: 'business', needsReview: false };
    // Could not confirm — default to personal and flag for owner reconciliation
    return { context: 'personal', needsReview: true };
  }

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

  // AI Categorization (runs in parallel with concurrency limit to avoid rate limits)
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

  // Write to Firestore in batches of 400 (Firestore limit is 500)
  const transactionChunks = chunkArray(transactions, 400);
  let totalSynced = 0;

  for (const chunk of transactionChunks) {
    const batch = firestore.batch() as WriteBatch;
    for (const tx of chunk) {
      const narration = tx.narration || '';
      const { context, needsReview } = classifyTransaction(narration);

      if (tx.type === 'debit') {
        const expenseRef = firestore.collection('users').doc(userId).collection('expenses').doc(tx._id);
        batch.set(expenseRef, {
          userId,
          amount: tx.amount / 100,
          currency: tx.currency,
          date: new Date(tx.date),
          category: tx.aiCategory || 'Other',
          description: narration || 'Unspecified Expense',
          context,
          needsReview,
          sourceAccountId: accountId,
        }, { merge: true });
      } else if (tx.type === 'credit') {
        const incomeRef = firestore.collection('users').doc(userId).collection('incomeSources').doc(tx._id);
        batch.set(incomeRef, {
          userId,
          name: narration || 'Unspecified Income',
          amount: tx.amount / 100,
          currency: tx.currency,
          date: new Date(tx.date),
          category: tx.aiCategory || 'Other Income',
          context,
          needsReview,
          sourceAccountId: accountId,
        }, { merge: true });
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
    fallbackCount,
  };
}
