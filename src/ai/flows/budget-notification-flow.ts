'use server';
/**
 * @fileOverview A flow to check user budgets and send notifications if they are close to or have exceeded their limits.
 * This flow is designed to be run by a cron job.
 */

import { initializeFirebase } from '@/firebase/server';
import type { Budget, Expense, UserProfile } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

export async function runBudgetNotificationCheck() {
  const { firestore, firebaseAdminApp } = initializeFirebase();
  if (!firestore || !firebaseAdminApp) {
    throw new Error('Firebase Admin SDK not initialized. Cron job cannot run.');
  }

  let sentNotifications = 0;

  // 1. Find users with notifications enabled and a premium plan
  const usersSnapshot = await firestore.collectionGroup('profile')
    .where('notificationsEnabled', '==', true)
    .where('plan', 'in', ['premium', 'pro-plus'])
    .get();

  if (usersSnapshot.empty) {
    console.log('Cron: No users for budget checks.');
    return { success: true, message: 'No users to notify for budgets.' };
  }

  for (const userDoc of usersSnapshot.docs) {
    const userProfile = userDoc.data() as UserProfile;
    const userId = userProfile.id;
    const fcmToken = userProfile.fcmToken;

    if (!fcmToken) continue;

    // 2. Get active budgets for the user
    const budgetsSnapshot = await firestore.collection(`users/${userId}/budgets`)
      .where('endDate', '>=', Timestamp.now())
      .get();
      
    if (budgetsSnapshot.empty) continue;

    for (const budgetDoc of budgetsSnapshot.docs) {
      const budget = budgetDoc.data() as Budget;

      // 3. Get relevant expenses for the budget's period
      const expensesQuery = firestore.collection(`users/${userId}/expenses`)
        .where('date', '>=', budget.startDate)
        .where('date', '<=', budget.endDate);

      const expensesSnapshot = await expensesQuery.get();
      
      const relevantExpenses = expensesSnapshot.docs
        .map(doc => doc.data() as Expense)
        .filter(expense => budget.category === 'Overall' || expense.category === budget.category);
      
      const totalSpent = relevantExpenses.reduce((sum, e) => sum + e.amount, 0);

      // 4. Check notification conditions
      const spendingRatio = totalSpent / budget.amount;
      let notificationBody: string | null = null;

      if (spendingRatio > 1 && budget.lastNotificationSent !== 'exceeded') {
        notificationBody = `You've exceeded your '${budget.name}' budget by ${budget.currency}${(totalSpent - budget.amount).toFixed(2)}!`;
        await budgetDoc.ref.update({ lastNotificationSent: 'exceeded' });
      } else if (spendingRatio >= 0.8 && budget.lastNotificationSent !== 'warning' && budget.lastNotificationSent !== 'exceeded') {
        notificationBody = `You've spent ${totalSpent.toFixed(2)} of your ${budget.amount} budget for '${budget.name}'. You're close to the limit!`;
        await budgetDoc.ref.update({ lastNotificationSent: 'warning' });
      }
      
      if (notificationBody) {
        const message = {
          notification: { title: 'Budget Alert', body: notificationBody },
          token: fcmToken,
        };
        try {
          await firebaseAdminApp.messaging().send(message);
          sentNotifications++;
          console.log(`Cron: Sent budget alert to ${userId} for "${budget.name}"`);
        } catch (error) {
          console.error(`Cron: Failed to send budget alert to ${userId}`, error);
        }
      }
    }
  }

  return { success: true, message: `Checked budgets. Sent ${sentNotifications} notifications.` };
}
