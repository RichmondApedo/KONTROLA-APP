'use server';
/**
 * @fileOverview A flow to handle disabling a user's Paystack subscription.
 *
 * - disableSubscription - Finds and disables a user's active subscription and downgrades their plan.
 * - DisableSubscriptionInput - The input type for the flow.
 * - DisableSubscriptionOutput - The output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebase } from '@/firebase/server';
import type { UserProfile } from '@/lib/types';
import * as admin from 'firebase-admin';

const { firestore } = initializeFirebase();

export const DisableSubscriptionInputSchema = z.object({
    userId: z.string().describe("The user's unique ID."),
});
export type DisableSubscriptionInput = z.infer<typeof DisableSubscriptionInputSchema>;

export const DisableSubscriptionOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});
export type DisableSubscriptionOutput = z.infer<typeof DisableSubscriptionOutputSchema>;

// Tool to get user profile to find their Paystack customer code
const getPaystackCustomerCode = ai.defineTool(
    {
        name: 'getPaystackCustomerCode',
        description: 'Retrieves the Paystack customer code for a given user.',
        inputSchema: z.object({ userId: z.string() }),
        outputSchema: z.object({ customerCode: z.string().optional() }),
    },
    async ({ userId }) => {
        if (!firestore) return { customerCode: undefined };
        const profileDoc = await firestore.doc(`users/${userId}/profile/${userId}`).get();
        if (!profileDoc.exists) return { customerCode: undefined };
        const profile = profileDoc.data() as UserProfile;
        return { customerCode: profile.paystackCustomerCode };
    }
);

// Tool to find the active subscription for a customer
const findActiveSubscription = ai.defineTool(
    {
        name: 'findActiveSubscription',
        description: "Finds a customer's active subscription code and token from Paystack.",
        inputSchema: z.object({ customerCode: z.string() }),
        outputSchema: z.object({
            subscriptionCode: z.string().optional(),
            emailToken: z.string().optional(),
        }),
    },
    async ({ customerCode }) => {
        const secretKey = process.env.PAYSTACK_SECRET_KEY;
        if (!secretKey || secretKey === 'your_paystack_secret_key_here') {
            return {};
        }

        try {
            const response = await fetch(`https://api.paystack.co/subscription?customer=${customerCode}&status=active`, {
                headers: { Authorization: `Bearer ${secretKey}` },
            });
            if (!response.ok) return {};
            const data = await response.json();
            // Assuming the first active subscription is the one to disable
            if (data.status && data.data.length > 0) {
                const sub = data.data[0];
                return { subscriptionCode: sub.subscription_code, emailToken: sub.email_token };
            }
            return {};
        } catch (error) {
            console.error('Error finding active subscription:', error);
            return {};
        }
    }
);

// Tool to call Paystack's disable subscription endpoint
const disablePaystackSubscription = ai.defineTool(
    {
        name: 'disablePaystackSubscription',
        description: 'Disables a subscription on Paystack.',
        inputSchema: z.object({
            subscriptionCode: z.string(),
            emailToken: z.string(),
        }),
        outputSchema: z.object({ success: z.boolean(), message: z.string() }),
    },
    async ({ subscriptionCode, emailToken }) => {
        const secretKey = process.env.PAYSTACK_SECRET_KEY;
        if (!secretKey || secretKey === 'your_paystack_secret_key_here') {
            return { success: false, message: 'Paystack secret key not configured.' };
        }
        try {
            const response = await fetch(`https://api.paystack.co/subscription/disable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${secretKey}`,
                },
                body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
            });
            const data = await response.json();
            return { success: data.status, message: data.message };
        } catch (error) {
            console.error('Paystack disable subscription request failed:', error);
            return { success: false, message: 'Failed to connect to payment gateway.' };
        }
    }
);

// Tool to downgrade user in Firestore
const downgradeUserPlan = ai.defineTool(
    {
        name: 'downgradeUserPlan',
        description: "Downgrades a user's plan to 'free' in Firestore.",
        inputSchema: z.object({ userId: z.string() }),
        outputSchema: z.object({ success: z.boolean() }),
    },
    async ({ userId }) => {
        if (!firestore) return { success: false };
        try {
            const userProfileRef = firestore.doc(`users/${userId}/profile/${userId}`);
            await userProfileRef.update({
                plan: 'free',
                subscriptionStatus: 'inactive',
                paystackPlanCode: admin.firestore.FieldValue.delete(),
                paystackCustomerCode: admin.firestore.FieldValue.delete(),
                subscriptionExpiry: admin.firestore.FieldValue.delete(),
            });
            return { success: true };
        } catch (error) {
            console.error('Firestore downgrade failed:', error);
            return { success: false };
        }
    }
);

// Main flow
const disableSubscriptionFlow = ai.defineFlow(
    {
        name: 'disableSubscriptionFlow',
        inputSchema: DisableSubscriptionInputSchema,
        outputSchema: DisableSubscriptionOutputSchema,
        system: "You are a subscription management agent. Your job is to find a user's active Paystack subscription, disable it, and then downgrade their plan in the app's database.",
        tools: [getPaystackCustomerCode, findActiveSubscription, disablePaystackSubscription, downgradeUserPlan],
    },
    async ({ userId }) => {
        const { customerCode } = await getPaystackCustomerCode({ userId });
        if (!customerCode) {
            // If no customer code, maybe they are already on a free plan. Let's try to set it to free.
            const downgradeResult = await downgradeUserPlan({ userId });
            if(downgradeResult.success) {
                return { success: true, message: 'User had no subscription. Plan set to free.' };
            }
            return { success: false, message: 'User does not have a Paystack customer code.' };
        }

        const subscription = await findActiveSubscription({ customerCode });
        if (!subscription.subscriptionCode || !subscription.emailToken) {
            // This might happen if they cancelled via Paystack's dashboard. Let's just sync our side.
            const downgradeResult = await downgradeUserPlan({ userId });
             if(downgradeResult.success) {
                return { success: true, message: 'No active subscription found on Paystack. Plan set to free.' };
            }
            return { success: false, message: 'No active Paystack subscription found for this user.' };
        }

        const disableResult = await disablePaystackSubscription(subscription);
        if (!disableResult.success) {
            return { success: false, message: `Failed to disable subscription on Paystack: ${disableResult.message}` };
        }
        
        const downgradeResult = await downgradeUserPlan({ userId });
        if (!downgradeResult.success) {
             return { success: false, message: 'Subscription disabled on Paystack, but failed to update user plan. Please contact support.' };
        }

        return { success: true, message: 'Subscription successfully disabled and plan downgraded.' };
    }
);

export async function disableSubscription(input: DisableSubscriptionInput): Promise<DisableSubscriptionOutput> {
    return disableSubscriptionFlow(input);
}
