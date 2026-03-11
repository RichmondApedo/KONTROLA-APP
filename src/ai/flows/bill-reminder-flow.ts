'use server';
/**
 * @fileOverview A flow to check for upcoming bills and send reminders.
 * This flow is designed to be run by a cron job.
 */

import { initializeFirebase } from '@/firebase/server';
import type { Bill, UserProfile } from '@/lib/types';
import { addDays, isSameDay } from 'date-fns';

export async function runBillReminderCheck() {
  const { firestore, firebaseAdminApp } = initializeFirebase();
  if (!firestore || !firebaseAdminApp) {
    throw new Error('Firebase Admin SDK not initialized. Cron job cannot run.');
  }

  const today = new Date();
  const threeDaysFromNow = addDays(today, 3);
  let sentNotifications = 0;

  // 1. Find users with notifications enabled
  const usersSnapshot = await firestore.collectionGroup('profile')
    .where('notificationsEnabled', '==', true)
    .where('plan', 'in', ['premium', 'pro-plus'])
    .get();

  if (usersSnapshot.empty) {
    console.log('Cron: No users with notifications enabled. Exiting bill check.');
    return { success: true, message: 'No users to notify.' };
  }

  // 2. For each user, find unpaid bills due soon
  for (const userDoc of usersSnapshot.docs) {
    const userProfile = userDoc.data() as UserProfile;
    const userId = userProfile.id;
    const fcmToken = userProfile.fcmToken;

    if (!fcmToken) {
      continue; // Skip user if no token
    }

    const billsSnapshot = await firestore.collection(`users/${userId}/bills`)
      .where('status', '==', 'unpaid')
      .where('dueDate', '>=', today)
      .where('dueDate', '<=', threeDaysFromNow)
      .get();
      
    if (billsSnapshot.empty) {
        continue;
    }

    for (const billDoc of billsSnapshot.docs) {
      const bill = billDoc.data() as Bill;
      const dueDate = (bill.dueDate as any).toDate ? (bill.dueDate as any).toDate() : new Date(bill.dueDate as string);
      
      const isDueToday = isSameDay(dueDate, today);
      const isDueIn3Days = isSameDay(dueDate, threeDaysFromNow);

      if (!isDueToday && !isDueIn3Days) {
        continue;
      }
      
      const message = {
        notification: {
          title: 'Upcoming Bill Reminder',
          body: `Your "${bill.name}" bill for ${bill.currency}${bill.amount} is due ${isDueToday ? 'today' : 'in 3 days'}.`,
        },
        token: fcmToken,
      };

      try {
        await firebaseAdminApp.messaging().send(message);
        sentNotifications++;
        console.log(`Cron: Sent bill reminder to ${userId} for "${bill.name}"`);
      } catch (error) {
        console.error(`Cron: Failed to send bill reminder to ${userId}`, error);
        // Could add logic here to handle invalid tokens
      }
    }
  }

  return { success: true, message: `Checked for upcoming bills. Sent ${sentNotifications} notifications.` };
}
