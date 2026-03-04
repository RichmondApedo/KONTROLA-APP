'use server';
/**
 * @fileOverview A flow to verify a Paystack payment and update the user's plan.
 *
 * - verifyPaymentAndUpdatePlan - Verifies a payment reference with Paystack and updates the user's plan in Firestore.
 * - VerifyPaymentInput - The input type for the verification function.
 * - VerifyPaymentOutput - The return type for the verification function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebase } from '@/firebase/server';

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

// Tool to call Paystack API
const verifyPaystackTransaction = ai.defineTool(
    {
        name: 'verifyPaystackTransaction',
        description: 'Verifies a Paystack transaction using the secret key.',
        inputSchema: z.object({ reference: z.string() }),
        outputSchema: z.object({
            status: z.boolean(),
            data: z.any(), // Keep as any for flexibility with Paystack's response
        }),
    },
    async ({ reference }) => {
        const secretKey = process.env.PAYSTACK_SECRET_KEY;
        if (!secretKey || secretKey === 'your_paystack_secret_key_here') {
            console.error('Paystack secret key not configured.');
            return { status: false, data: { message: 'Server configuration error.' } };
        }

        try {
            const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                },
            });
            const data = await response.json();
            return { status: data.status, data: data.data };
        } catch (error) {
            console.error('Paystack verification request failed:', error);
            return { status: false, data: { message: 'Failed to connect to payment gateway.' } };
        }
    }
);

// Tool to update user profile in Firestore
const UpdateUserSubscriptionInputSchema = z.object({
    userId: z.string(),
    plan: z.enum(['premium', 'pro-plus']),
    paystackPlanCode: z.string(),
    paystackCustomerCode: z.string(),
    subscriptionExpiry: z.date().optional(),
    paymentReference: z.string(),
});

const updateUserSubscriptionInFirestore = ai.defineTool(
    {
        name: 'updateUserSubscriptionInFirestore',
        description: "Updates the user's subscription details in their Firestore profile after a successful payment.",
        inputSchema: UpdateUserSubscriptionInputSchema,
        outputSchema: z.object({ success: z.boolean() }),
    },
    async ({ userId, plan, paystackPlanCode, paystackCustomerCode, subscriptionExpiry, paymentReference }) => {
        if (!firestore) {
            console.error("Firestore not initialized in updateUserSubscriptionInFirestore tool.");
            return { success: false };
        }
        try {
            const userProfileRef = firestore.doc(`users/${userId}/profile/${userId}`);
            
            const updateData: any = {
                plan: plan,
                subscriptionStatus: 'active',
                paystackPlanCode: paystackPlanCode,
                paystackCustomerCode: paystackCustomerCode,
                paymentReference: paymentReference,
            };

            if (subscriptionExpiry) {
                updateData.subscriptionExpiry = subscriptionExpiry;
            }

            await userProfileRef.set(updateData, { merge: true });

            return { success: true };
        } catch (error) {
            console.error('Firestore update failed:', error);
            return { success: false };
        }
    }
);


// Main Flow
export const verifyPaymentAndUpdatePlanFlow = ai.defineFlow(
    {
        name: 'verifyPaymentAndUpdatePlanFlow',
        inputSchema: VerifyPaymentInputSchema,
        outputSchema: VerifyPaymentOutputSchema,
        system: "You are a payment verification agent. Your role is to verify a payment with Paystack and then update the user's subscription plan in the database if the payment is successful.",
        tools: [verifyPaystackTransaction, updateUserSubscriptionInFirestore],
    },
    async (input) => {
       const verificationResult = await verifyPaystackTransaction({ reference: input.reference });

       if (!verificationResult.status || verificationResult.data.status !== 'success') {
            return { success: false, message: 'Payment verification failed.' };
       }

       // Extract data from successful verification
       const { customer, authorization } = verificationResult.data;
       const customerCode = customer?.customer_code;
       const nextPaymentDate = authorization?.next_payment_date;

       if (!customerCode) {
           return { success: false, message: 'Could not retrieve customer code from Paystack.' };
       }

       const updateResult = await updateUserSubscriptionInFirestore({
           userId: input.userId,
           plan: input.plan,
           paystackPlanCode: input.planCode,
           paystackCustomerCode: customerCode,
           subscriptionExpiry: nextPaymentDate ? new Date(nextPaymentDate) : undefined,
           paymentReference: input.reference,
       });
       
       if (!updateResult.success) {
            return { success: false, message: 'Payment verified, but failed to update user plan. Please contact support.' };
       }

       return { success: true, message: 'Payment successful and plan updated.' };
    }
);

// Wrapper function to call the flow
export async function verifyPaymentAndUpdatePlan(input: VerifyPaymentInput): Promise<VerifyPaymentOutput> {
    return verifyPaymentAndUpdatePlanFlow(input);
}
