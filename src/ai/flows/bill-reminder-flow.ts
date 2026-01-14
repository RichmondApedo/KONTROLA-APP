'use server';
/**
 * @fileOverview A flow to find and notify users about upcoming bills.
 *
 * - runBillReminderCheck - Manually triggers the flow to check for bills due tomorrow.
 * - BillReminderOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collectionGroup, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/server'; // Use server-initialized firebase
import type { UserProfile, Bill } from '@/lib/types';
import * as admin from 'firebase-admin';

// Initialize server-side Firebase
const { firestore, firebaseAdminApp } = initializeFirebase();

const BillReminderOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  remindersSent: z.number(),
});
export type BillReminderOutput = z.infer<typeof BillReminderOutputSchema>;

// Tool to get all users who have bills due tomorrow and have notifications enabled
const getUsersWithUpcomingBills = ai.defineTool(
  {
    name: 'getUsersWithUpcomingBills',
    description: 'Retrieves a list of users and their specific bills that are due tomorrow.',
    inputSchema: z.object({}),
    outputSchema: z.array(z.object({
        user: z.custom<UserProfile>(),
        bill: z.custom<Bill>(),
    })),
  },
  async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0));
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999));

    const billsQuery = query(
      collectionGroup(firestore, 'bills'),
      where('status', '==', 'unpaid'),
      where('dueDate', '>=', tomorrowStart.toISOString()),
      where('dueDate', '<=', tomorrowEnd.toISOString())
    );

    const billsSnapshot = await getDocs(billsQuery);
    if (billsSnapshot.empty) {
      return [];
    }

    const results = [];
    for (const billDoc of billsSnapshot.docs) {
      const bill = { id: billDoc.id, ...billDoc.data() } as Bill;
      const userProfileRef = doc(firestore, 'users', bill.userId, 'profile', bill.userId);
      const userDoc = await getDoc(userProfileRef);

      if (userDoc.exists()) {
        const userProfile = userDoc.data() as UserProfile;
        // Only include user if they have an FCM token and enabled notifications
        if (userProfile.fcmToken && userProfile.notificationsEnabled) {
             results.push({
                user: userProfile,
                bill: bill,
            });
        }
      }
    }
    return results;
  }
);

// Tool to send a real reminder via FCM
const sendReminderNotification = ai.defineTool(
    {
        name: 'sendReminderNotification',
        description: 'Sends a bill reminder notification to a user via FCM.',
        inputSchema: z.object({
            user: z.custom<UserProfile>(),
            bill: z.custom<Bill>(),
        }),
        outputSchema: z.object({ success: z.boolean() }),
    },
    async ({ user, bill }) => {
        if (!user.fcmToken) {
            console.log(`User ${user.email} has no FCM token. Skipping.`);
            return { success: false };
        }

        const message = {
            token: user.fcmToken,
            notification: {
                title: "Bill Reminder 🔔",
                body: `Your ${bill.name} bill of ${bill.currency.toUpperCase()} ${bill.amount} is due tomorrow.`,
            },
            data: {
                billId: bill.id,
                type: 'BILL_REMINDER',
                url: '/dashboard/bills' // deep link to the bills page
            }
        };

        try {
            await admin.messaging(firebaseAdminApp).send(message);
            console.log(`Successfully sent reminder to ${user.email} for bill: ${bill.name}`);
            return { success: true };
        } catch (error: any) {
            console.error(`Failed to send notification to ${user.email}:`, error);
            // This can happen if the token is invalid. You might want to remove it from the profile.
            if (error.code === 'messaging/registration-token-not-registered') {
                const userProfileRef = doc(firestore, 'users', user.id, 'profile', user.id);
                await admin.firestore().doc(userProfileRef.path).update({ fcmToken: admin.firestore.FieldValue.delete() });
            }
            return { success: false };
        }
    }
);


export const billReminderFlow = ai.defineFlow(
  {
    name: 'billReminderFlow',
    inputSchema: z.object({}),
    outputSchema: BillReminderOutputSchema,
    system: "You are a financial assistant responsible for reminding users about their upcoming bills. Use the available tools to find users with bills due and send them reminders via push notifications.",
    tools: [getUsersWithUpcomingBills, sendReminderNotification],
  },
  async () => {
    const usersAndBills = await getUsersWithUpcomingBills({});
    
    if (usersAndBills.length === 0) {
        return { success: true, message: 'No bills due tomorrow for any user with notifications enabled.', remindersSent: 0 };
    }

    let remindersSent = 0;
    for (const item of usersAndBills) {
        const result = await sendReminderNotification(item);
        if (result.success) {
            remindersSent++;
        }
    }

    return { success: true, message: `Successfully sent ${remindersSent} bill reminders.`, remindersSent };
  }
);


export async function runBillReminderCheck(): Promise<BillReminderOutput> {
    return billReminderFlow({});
}
