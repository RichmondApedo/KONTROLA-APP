'use server';
/**
 * @fileOverview A flow to find and notify users about their budget status.
 *
 * - runBudgetNotificationCheck - Manually triggers the flow to check budgets.
 * - BudgetNotificationOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebase } from '@/firebase/server';
import type { UserProfile, Budget, Expense } from '@/lib/types';
import * as admin from 'firebase-admin';

const { firestore, firebaseAdminApp } = initializeFirebase();

const BudgetNotificationOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  notificationsSent: z.number(),
});
export type BudgetNotificationOutput = z.infer<typeof BudgetNotificationOutputSchema>;

type BudgetCheckResult = {
    user: UserProfile,
    budget: Budget,
    totalSpent: number,
};

// This tool will gather all the necessary data.
const getBudgetsForAlerts = ai.defineTool(
  {
    name: 'getBudgetsForAlerts',
    description: 'Retrieves all active budgets and their current spending for users with notifications enabled.',
    inputSchema: z.object({}),
    outputSchema: z.array(z.custom<BudgetCheckResult>()),
  },
  async () => {
    if (!firestore) {
        console.warn('getBudgetsForAlerts: Firestore is not initialized.');
        return [];
    }

    const budgetsSnapshot = await firestore.collectionGroup('budgets').get();
    if (budgetsSnapshot.empty) {
      return [];
    }

    const results: BudgetCheckResult[] = [];
    for (const budgetDoc of budgetsSnapshot.docs) {
      const budget = { id: budgetDoc.id, ...budgetDoc.data() } as Budget;

      // Firestore timestamps need to be converted to JS Dates
      const budgetStartDate = (budget.startDate as any).toDate ? (budget.startDate as any).toDate() : new Date(budget.startDate);
      const budgetEndDate = (budget.endDate as any).toDate ? (budget.endDate as any).toDate() : new Date(budget.endDate);

      // Skip expired budgets
      if (new Date() > budgetEndDate) {
          continue;
      }
      
      const userProfileRef = firestore.doc(`users/${budget.userId}/profile/${budget.userId}`);
      const userDoc = await userProfileRef.get();

      if (userDoc.exists) {
        const user = userDoc.data() as UserProfile;

        // Only process for users who have notifications enabled and a token
        if (user.fcmToken && user.notificationsEnabled) {
            const expensesQuery = firestore.collection(`users/${user.id}/expenses`)
                .where('date', '>=', budgetStartDate)
                .where('date', '<=', budgetEndDate);
            
            const expensesSnapshot = await expensesQuery.get();
            
            const relevantExpenses = expensesSnapshot.docs.map(d => d.data() as Expense).filter(expense => {
                return budget.category === 'Overall' || expense.category === budget.category;
            });

            const totalSpent = relevantExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            
            results.push({ user, budget, totalSpent });
        }
      }
    }
    return results;
  }
);


const sendBudgetNotification = ai.defineTool(
    {
        name: 'sendBudgetNotification',
        description: 'Sends a budget notification to a user via FCM.',
        inputSchema: z.object({
            user: z.custom<UserProfile>(),
            messageBody: z.string(),
            budgetId: z.string(),
        }),
        outputSchema: z.object({ success: z.boolean() }),
    },
    async ({ user, messageBody, budgetId }) => {
        if (!firebaseAdminApp) {
            console.warn(`sendBudgetNotification: Firebase Admin is not initialized. Cannot send notification to ${user.email}.`);
            return { success: false };
        }

        if (!user.fcmToken) {
            console.log(`User ${user.email} has no FCM token. Skipping.`);
            return { success: false };
        }

        const message = {
            token: user.fcmToken,
            notification: {
                title: "Budget Alert 💰",
                body: messageBody,
            },
            data: {
                budgetId: budgetId,
                type: 'BUDGET_ALERT',
                url: '/dashboard/budget'
            }
        };

        try {
            await admin.messaging(firebaseAdminApp).send(message);
            console.log(`Successfully sent budget alert to ${user.email}`);
            return { success: true };
        } catch (error: any) {
            console.error(`Failed to send notification to ${user.email}:`, error);
            if (error.code === 'messaging/registration-token-not-registered' && firestore) {
                const userProfileRef = firestore.doc(`users/${user.id}/profile/${user.id}`);
                await userProfileRef.update({ fcmToken: admin.firestore.FieldValue.delete() });
            }
            return { success: false };
        }
    }
);

// The main flow
export const budgetNotificationFlow = ai.defineFlow(
  {
    name: 'budgetNotificationFlow',
    inputSchema: z.object({}),
    outputSchema: BudgetNotificationOutputSchema,
    system: "You are a financial assistant responsible for monitoring user budgets and sending alerts when they are close to or have exceeded their spending limits.",
    tools: [getBudgetsForAlerts, sendBudgetNotification],
  },
  async () => {
    if (!firestore) {
        return { success: false, message: 'Firestore not initialized.', notificationsSent: 0 };
    }

    const budgetChecks = await getBudgetsForAlerts({});
    
    if (budgetChecks.length === 0) {
        return { success: true, message: 'No active budgets to check.', notificationsSent: 0 };
    }

    let notificationsSent = 0;
    for (const { user, budget, totalSpent } of budgetChecks) {
        const percentage = (totalSpent / budget.amount) * 100;
        const budgetRef = firestore.doc(`users/${user.id}/budgets/${budget.id}`);

        let notificationSent = false;

        // Exceeded budget
        if (percentage >= 100 && budget.lastNotificationSent !== 'exceeded') {
            const messageBody = `You've exceeded your '${budget.name}' budget, spending ${budget.currency.toUpperCase()} ${totalSpent.toFixed(2)} of ${budget.currency.toUpperCase()} ${budget.amount}.`;
            const result = await sendBudgetNotification({ user, messageBody, budgetId: budget.id });
            if (result.success) {
                await budgetRef.update({ lastNotificationSent: 'exceeded' });
                notificationsSent++;
                notificationSent = true;
            }
        } 
        // Warning for approaching budget limit
        else if (percentage >= 80 && !budget.lastNotificationSent) {
             const messageBody = `You've used ${percentage.toFixed(0)}% of your '${budget.name}' budget. You've spent ${budget.currency.toUpperCase()} ${totalSpent.toFixed(2)} so far.`;
            const result = await sendBudgetNotification({ user, messageBody, budgetId: budget.id });
            if (result.success) {
                await budgetRef.update({ lastNotificationSent: 'warning' });
                notificationsSent++;
                notificationSent = true;
            }
        }

        if (notificationSent) {
            // Simple delay to avoid hitting FCM rate limits if many notifications are sent at once.
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    return { success: true, message: `Check complete. Sent ${notificationsSent} budget notifications.`, notificationsSent };
  }
);

// Export a function to run the flow manually (e.g., from a cron job or admin panel)
export async function runBudgetNotificationCheck(): Promise<BudgetNotificationOutput> {
    return budgetNotificationFlow({});
}
