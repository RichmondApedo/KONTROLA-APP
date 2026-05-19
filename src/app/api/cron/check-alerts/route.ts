import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/server';
import { sendNotification } from '@/lib/notifications';
import { addDays, isBefore, startOfDay } from 'date-fns';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { firebaseAdminApp, firestore } = initializeFirebase();
    if (!firebaseAdminApp || !firestore) {
        return NextResponse.json({ error: 'Server not configured for Firebase.' }, { status: 500 });
    }

    // 1. Standard Vercel Cron Security (Header or Query parameter fallback)
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get('secret');
    const authHeader = request.headers.get('authorization');
    
    const isAuthorized = 
      authHeader === `Bearer ${process.env.CRON_SECRET}` || 
      (secretParam !== null && secretParam === process.env.CRON_SECRET);

    if (!isAuthorized && process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: any[] = [];
    const now = new Date();
    const threshold = addDays(startOfDay(now), 2); // 2 days from now

    try {
        // 2. Fetch all users with notifications enabled
        const usersSnapshot = await firestore.collectionGroup('profile')
            .where('notificationsEnabled', '==', true)
            .get();

        for (const userDoc of usersSnapshot.docs) {
            const profile = userDoc.data();
            const userId = profile.id;

            if (!userId) continue;

            // --- CHECK BILLS ---
            const billsSnapshot = await firestore.collection('users').doc(userId).collection('bills')
                .where('status', '==', 'unpaid')
                .get();

            for (const billDoc of billsSnapshot.docs) {
                const bill = billDoc.data();
                const dueDate = bill.dueDate?.toDate ? bill.dueDate.toDate() : new Date(bill.dueDate);

                // If due within 2 days AND we haven't sent a reminder yet (or at least not today)
                if (isBefore(dueDate, threshold) && isBefore(now, dueDate)) {
                    // We could check a 'lastReminderSentAt' field to avoid duplicate pushes
                    const lastReminderAt = bill.lastReminderSentAt?.toDate ? bill.lastReminderSentAt.toDate() : (bill.lastReminderSentAt ? new Date(bill.lastReminderSentAt) : null);
                    
                    if (!lastReminderAt || isBefore(lastReminderAt, startOfDay(now))) {
                        await sendNotification({
                            userId,
                            title: "Upcoming Bill Reminder",
                            body: `Your payment for "${bill.name}" of ${bill.amount} ${bill.currency.toUpperCase()} is due soon on ${dueDate.toLocaleDateString()}.`,
                            type: 'bill_reminder',
                            data: { billId: billDoc.id }
                        });

                        // Update bill with last reminder timestamp
                        await billDoc.ref.update({
                            lastReminderSentAt: admin.firestore.FieldValue.serverTimestamp()
                        });

                        results.push({ userId, billId: billDoc.id, status: 'notified' });
                    }
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            processed: usersSnapshot.size, 
            notified: results.length,
            details: results 
        });

    } catch (error: any) {
        console.error('[CRON Check Alerts] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
