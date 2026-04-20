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
import type { LinkedAccount } from '@/lib/types';
import { syncAccountTransactions } from './sync-transactions-flow';

const ExchangeTokenInputSchema = z.object({
  code: z.string().describe('The temporary public token from Mono Connect.'),
  userId: z.string().describe("The user's unique ID."),
  accountPurpose: z.enum(['personal', 'business', 'both']).optional().describe('How this account will be used.'),
  idToken: z.string().describe("Firebase ID token for secure server-side validation."),
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

  const secretKey = process.env.MONO_SECRET_KEY;

  if (!secretKey || secretKey === 'your_mono_secret_key_here') {
    const errorMessage = "Mono secret key is not configured on the server. Account linking is disabled.";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  const parsedInput = ExchangeTokenInputSchema.safeParse(input);
  if (!parsedInput.success) {
    console.error("Invalid input for exchangeTokenForAccount:", parsedInput.error);
    throw new Error("Invalid input provided for account linking.");
  }
  const { code, userId, accountPurpose, idToken } = parsedInput.data;

  // --- SECURITY: Authenticate the requesting user ---
  try {
     const admin = await import('firebase-admin');
     const { firebaseAdminApp: adminApp } = initializeFirebase();
     if (!adminApp) throw new Error("Admin app not initialized");
     
     const decodedToken = await admin.auth(adminApp).verifyIdToken(idToken);
     if (decodedToken.uid !== userId) {
         throw new Error("Authorization failed: UID mismatch.");
     }
  } catch (err: any) {
     console.error("IDOR Attempt or Auth Failure in Linking:", err.message);
     throw new Error("You are not authorized to link to this account.");
  }

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
      accountPurpose: accountPurpose || 'personal',
  };
  await accountRef.set(accountData);

  // 4. Fetch and save transactions using the dedicated sync flow
  try {
    const syncResult = await syncAccountTransactions({ accountId, userId, idToken });
    // The success message will now include info about the transaction sync
    return { success: true, message: `Account linked successfully. ${syncResult.message}`, accountId };
  } catch (error: any) {
    // If transaction sync fails, the account is still linked. We should inform the user.
    console.warn(`Initial transaction sync failed for account ${accountId}:`, error.message);
    // Return success for the linking part, but with a warning message.
    return { 
        success: true, // The account *is* linked
        message: `Account linked, but the initial transaction sync failed. Please try syncing manually from the settings page.`, 
        accountId 
    };
  }
}
