'use server';
/**
 * @fileOverview A flow to find and notify users about making progress on their savings goals.
 *
 * - runGoalReminderCheck - Manually triggers the flow to check for goals needing a reminder.
 * - GoalReminderOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebase } from '@/firebase/server';
import type { UserProfile, SavingsGoal } from '@/lib/types';
import * as admin from 'firebase-admin';

const { firestore, firebaseAdminApp } = initializeFirebase();

const GoalReminderOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  remindersSent: z.number(),
});
export type GoalReminderOutput = z.infer<typeof GoalReminderOutputSchema>;

type GoalReminderCandidate = {
    user: UserProfile,
    goal: SavingsGoal,
};

// Tool to get users who have goals that need a reminder nudge
const getUsersForGoalReminders = ai.defineTool(
  {
    name: 'getUsersForGoalReminders',
    description: 'Retrieves users with active savings goals who have notifications enabled and haven\'t made a contribution or received a reminder recently.',
    inputSchema: z.object({}),
    outputSchema: z.array(z.custom<GoalReminderCandidate>()),
  },
  async () => {
    if (!firestore) {
        console.warn('getUsersForGoalReminders: Firestore is not initialized. Skipping check.');
        return [];
    }
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const goalsSnapshot = await firestore.collectionGroup('savingsGoals').get();
    if (goalsSnapshot.empty) {
      return [];
    }
    
    const candidates: GoalReminderCandidate[] = [];

    for (const goalDoc of goalsSnapshot.docs) {
      const goal = { id: goalDoc.id, ...goalDoc.data() } as SavingsGoal;

      // Skip completed goals
      if (goal.currentAmount >= goal.targetAmount) {
        continue;
      }

      const lastContribution = goal.lastContributionDate ? (goal.lastContributionDate as any).toDate() : null;
      const lastReminder = goal.lastReminderSentAt ? (goal.lastReminderSentAt as any).toDate() : null;

      // Condition: No contribution in last 7 days AND no reminder in last 7 days
      if ((!lastContribution || lastContribution < sevenDaysAgo) && (!lastReminder || lastReminder < sevenDaysAgo)) {
        const userProfileRef = firestore.doc(`users/${goal.userId}/profile/${goal.userId}`);
        const userDoc = await userProfileRef.get();

        if (userDoc.exists) {
          const user = {id: userDoc.id, ...userDoc.data()} as UserProfile;
          if (user.fcmToken && user.notificationsEnabled) {
            candidates.push({ user, goal });
          }
        }
      }
    }
    return candidates;
  }
);


const sendGoalReminderNotification = ai.defineTool(
    {
        name: 'sendGoalReminderNotification',
        description: 'Sends a savings goal reminder notification to a user and updates the reminder timestamp.',
        inputSchema: z.custom<GoalReminderCandidate>(),
        outputSchema: z.object({ success: z.boolean() }),
    },
    async ({ user, goal }) => {
        if (!firebaseAdminApp || !firestore) {
            console.warn(`sendGoalReminderNotification: Firebase services are not initialized. Cannot send notification to ${user.email}.`);
            return { success: false };
        }

        if (!user.fcmToken) {
            console.log(`User ${user.email} has no FCM token. Skipping.`);
            return { success: false };
        }

        const message = {
            token: user.fcmToken,
            notification: {
                title: "Keep Up the Momentum! 💪",
                body: `Don't forget about your goal: "${goal.name}". A small contribution can make a big difference!`,
            },
            data: {
                goalId: goal.id,
                type: 'GOAL_REMINDER',
                url: '/dashboard/goals'
            }
        };

        try {
            await admin.messaging(firebaseAdminApp).send(message);
            
            // Update the last reminder sent timestamp on success
            const goalRef = firestore.doc(`users/${user.id}/savingsGoals/${goal.id}`);
            await goalRef.update({ lastReminderSentAt: new Date() });

            console.log(`Successfully sent goal reminder to ${user.email} for goal: ${goal.name}`);
            return { success: true };
        } catch (error: any) {
            console.error(`Failed to send notification to ${user.email}:`, error);
            if (error.code === 'messaging/registration-token-not-registered') {
                const userProfileRef = firestore.doc(`users/${user.id}/profile/${user.id}`);
                await userProfileRef.update({ fcmToken: admin.firestore.FieldValue.delete() });
            }
            return { success: false };
        }
    }
);


export const goalReminderFlow = ai.defineFlow(
  {
    name: 'goalReminderFlow',
    inputSchema: z.object({}),
    outputSchema: GoalReminderOutputSchema,
    system: "You are a financial assistant that encourages users to save. Use the available tools to find users who need a nudge for their savings goals and send them a reminder.",
    tools: [getUsersForGoalReminders, sendGoalReminderNotification],
    model: 'googleai/gemini-1.5-flash',
  },
  async () => {
    const candidates = await getUsersForGoalReminders({});
    
    if (candidates.length === 0) {
        return { success: true, message: 'No users needed a goal reminder today.', remindersSent: 0 };
    }

    let remindersSent = 0;
    for (const candidate of candidates) {
        const result = await sendGoalReminderNotification(candidate);
        if (result.success) {
            remindersSent++;
        }
    }

    return { success: true, message: `Check complete. Sent ${remindersSent} goal reminders.`, remindersSent };
  }
);


export async function runGoalReminderCheck(): Promise<GoalReminderOutput> {
    return goalReminderFlow({});
}
