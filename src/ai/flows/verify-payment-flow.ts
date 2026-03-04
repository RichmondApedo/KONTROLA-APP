'use server';
/**
 * @fileOverview A server action to verify a Paystack payment and update the user's plan.
 *
 * - verifyPaymentAndUpdatePlan - Verifies a payment reference with Paystack, disables any old subscription, and updates the user's plan in Firestore.
 * - VerifyPaymentInput - The input type for the verification function.
 * - VerifyPaymentOutput - The return type for the verification function.
 */

import { z } from 'zod';
import { initializeFirebase } from '@/firebase/server';
import type { UserProfile } from '@/lib/types';

// Initialize Firestore through the central server function
const { firestore } = initializeFirebase();

export const VerifyPaymentInputSchema = z.object({
  reference: z.string().describe('The Paystack payment reference.'),
  plan: z.enum(['premium', 'pro-plus']).describe('The plan the user is purchasing.'),
  userId: z.string().describe("The user's unique ID."),
  planCode: z.string().describe('The Paystack plan code for the subscription.'),
});
export type VerifyPaymentInput = z.infer<typeof VerifyPaymentInputSchema>;

export const VerifyPaymentOutputSchema = z.object({
  success: z.boolean().describe('Whether the payment was successful and the plan was updated.'),
  message: z.string().describe('A message indicating the result of the operation.'),
});
export type VerifyPaymentOutput = z.infer<typeof VerifyPaymentOutputSchema>;

// This is a standard Next.js Server Action. It will throw an error on failure.
export async function verifyPaymentAndUpdatePlan(input: VerifyPaymentInput): Promise<VerifyPaymentOutput> {
  const parsedInput = VerifyPaymentInputSchema.safeParse(input);
  if (!parsedInput.success) {
    console.error("Invalid input for verifyPaymentAndUpdatePlan:", parsedInput.error);
    throw new Error("Invalid input provided for payment verification.");
  }
  
  if (!firestore) {
    throw new Error('Server not configured for Firebase.');
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey || secretKey === 'your_paystack_secret_key_here') {
    throw new Error('Paystack secret key not configured.');
  }

  const { reference, plan, userId, planCode } = parsedInput.data;

  // 1. Verify the new transaction
  const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!verifyResponse.ok) {
    throw new Error('Failed to connect to payment gateway for verification.');
  }
  const verifyData = await verifyResponse.json();
  if (!verifyData.status || verifyData.data.status !== 'success') {
    throw new Error(verifyData.message || 'Payment verification failed with Paystack.');
  }
  
  // 2. Disable any existing subscription
  const profileRef = firestore.doc(`users/${userId}/profile/${userId}`);
  try {
      const profileSnap = await profileRef.get();
      if (profileSnap.exists()) {
          const userProfile = profileSnap.data() as UserProfile;
          const { paystackCustomerCode } = userProfile;

          if (paystackCustomerCode) {
              const subResponse = await fetch(`https://api.paystack.co/subscription?customer=${paystackCustomerCode}&status=active`, {
                  headers: { Authorization: `Bearer ${secretKey}` },
              });
              if (subResponse.ok) {
                  const subData = await subResponse.json();
                  if (subData.status && subData.data.length > 0) {
                      const { subscription_code, email_token } = subData.data[0];
                      if (subscription_code && email_token) {
                          await fetch(`https://api.paystack.co/subscription/disable`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secretKey}` },
                              body: JSON.stringify({ code: subscription_code, token: email_token }),
                          });
                          console.log(`Successfully disabled old subscription ${subscription_code} for user ${userId}.`);
                      }
                  }
              }
          }
      }
  } catch (e) {
      console.warn("Could not disable old subscription during upgrade. This might be okay if none existed. Error:", e);
      // We don't throw an error here because activating the new plan is more important.
  }

  // 3. Update Firestore with new subscription details
  const { customer, authorization } = verifyData.data;
  const customerCode = customer?.customer_code;
  const nextPaymentDate = authorization?.next_payment_date;

  if (!customerCode) {
      throw new Error('Could not retrieve customer code from Paystack after verification.');
  }

  await profileRef.set({
      plan: plan,
      subscriptionStatus: 'active',
      paystackPlanCode: planCode,
      paystackCustomerCode: customerCode,
      subscriptionExpiry: nextPaymentDate ? new Date(nextPaymentDate) : null,
      paymentReference: reference,
  }, { merge: true });

  return { success: true, message: 'Payment successful and plan updated.' };
}
