'use server';
/**
 * @fileOverview A flow to check user savings goals and send reminders if no progress has been made.
 * This flow is designed to be run by a cron job.
 */

import { initializeFirebase } from '@/firebase/server';
import type { SavingsGoal, UserProfile } from '@/lib/types';
import { subDays, isBefore } from 'date-fns';

export async function runGoalReminderCheck() {
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
    console.log('Cron: No users for goal reminder checks.');
    return { success: true, message: 'No users to notify for goals.' };
  }

  const sevenDaysAgo = subDays(new Date(), 7);

  for (const userDoc of usersSnapshot.docs) {
    const userProfile = userDoc.data() as UserProfile;
    const userId = userProfile.id;
    const fcmToken = userProfile.fcmToken;

    if (!fcmToken) continue;

    // 2. Get active savings goals for the user
    const goalsSnapshot = await firestore.collection(`users/${userId}/savingsGoals`).get();
      
    if (goalsSnapshot.empty) continue;

    for (const goalDoc of goalsSnapshot.docs) {
      const goal = goalDoc.data() as SavingsGoal;

      // Check if goal is already completed
      if (goal.currentAmount >= goal.targetAmount) {
        continue;
      }

      const lastContribution = goal.lastContributionDate ? 
        (goal.lastContributionDate as any).toDate ? (goal.lastContributionDate as any).toDate() : new Date(goal.lastContributionDate as string) 
        : null;
        
      const lastReminder = goal.lastReminderSentAt ?
        (goal.lastReminderSentAt as any).toDate ? (goal.lastReminderSentAt as any).toDate() : new Date(goal.lastReminderSentAt as string)
        : null;

      // Condition: No contribution in the last 7 days AND no reminder sent in the last 7 days
      const needsReminder = (!lastContribution || isBefore(lastContribution, sevenDaysAgo)) && (!lastReminder || isBefore(lastReminder, sevenDaysAgo));

      if (needsReminder) {
        const message = {
          notification: {
            title: 'Savings Goal Reminder',
            body: `Don't forget about your goal: "${goal.name}". A small contribution can make a big difference!`,
          },
          token: fcmToken,
        };

        try {
          await firebaseAdminApp.messaging().send(message);
          // Update the last reminder timestamp
          await goalDoc.ref.update({ lastReminderSentAt: new Date() });
          sentNotifications++;
          console.log(`Cron: Sent goal reminder to ${userId} for "${goal.name}"`);
        } catch (error) {
          console.error(`Cron: Failed to send goal reminder to ${userId}`, error);
        }
      }
    }
  }

  return { success: true, message: `Checked savings goals. Sent ${sentNotifications} notifications.` };
}
