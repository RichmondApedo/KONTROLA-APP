'use server';
/**
 * @fileOverview A flow to find and notify users about upcoming bills.
 *
 * - runBillReminderCheck - Manually triggers the flow to check for bills due tomorrow.
 * - BillReminderOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collectionGroup, getDocs, query, where, getFirestore, collection, getDoc, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { UserProfile, Bill } from '@/lib/types';

// Initialize Firestore through the central function
const { firestore } = initializeFirebase();

const BillReminderOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  remindersSent: z.number(),
});
export type BillReminderOutput = z.infer<typeof BillReminderOutputSchema>;

// Tool to get all users who have bills due tomorrow
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
        results.push({
          user: userDoc.data() as UserProfile,
          bill: bill,
        });
      }
    }
    return results;
  }
);

// Tool to "send" a reminder. In a real app, this would use FCM or another service.
const sendReminderNotification = ai.defineTool(
    {
        name: 'sendReminderNotification',
        description: 'Sends a bill reminder notification to a user.',
        inputSchema: z.object({
            user: z.custom<UserProfile>(),
            bill: z.custom<Bill>(),
        }),
        outputSchema: z.object({ success: z.boolean() }),
    },
    async ({ user, bill }) => {
        // In a real application, you would use a service like Firebase Cloud Messaging (FCM)
        // to send a push notification to the user's device using a stored FCM token.
        console.log(`Simulating sending reminder to ${user.email} for bill: ${bill.name}`);
        console.log(`Message: Your ${bill.name} bill of ${bill.currency.toUpperCase()} ${bill.amount} is due tomorrow.`);
        
        // For now, we just log it and return success.
        return { success: true };
    }
);


export const billReminderFlow = ai.defineFlow(
  {
    name: 'billReminderFlow',
    inputSchema: z.object({}),
    outputSchema: BillReminderOutputSchema,
    system: "You are a financial assistant responsible for reminding users about their upcoming bills. Use the available tools to find users with bills due and send them reminders.",
    tools: [getUsersWithUpcomingBills, sendReminderNotification],
  },
  async () => {
    const usersAndBills = await getUsersWithUpcomingBills({});
    
    if (usersAndBills.length === 0) {
        return { success: true, message: 'No bills due tomorrow for any user.', remindersSent: 0 };
    }

    let remindersSent = 0;
    for (const item of usersAndBills) {
        await sendReminderNotification(item);
        remindersSent++;
    }

    return { success: true, message: `Successfully sent ${remindersSent} bill reminders.`, remindersSent };
  }
);


export async function runBillReminderCheck(): Promise<BillReminderOutput> {
    return billReminderFlow({});
}
