import { NextResponse } from 'next/server';
import { runBillReminderCheck } from '@/ai/flows/bill-reminder-flow';
import { runBudgetNotificationCheck } from '@/ai/flows/budget-notification-flow';
import { runGoalReminderCheck } from '@/ai/flows/goal-reminder-flow';

export const dynamic = 'force-dynamic'; // Ensures the route is not cached

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const cronSecret = searchParams.get('secret');

  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [billResult, budgetResult, goalResult] = await Promise.allSettled([
      runBillReminderCheck(),
      runBudgetNotificationCheck(),
      runGoalReminderCheck(),
    ]);

    const results = {
      bills: billResult.status === 'fulfilled' ? billResult.value : { success: false, message: (billResult.reason as Error).message },
      budgets: budgetResult.status === 'fulfilled' ? budgetResult.value : { success: false, message: (budgetResult.reason as Error).message },
      goals: goalResult.status === 'fulfilled' ? goalResult.value : { success: false, message: (goalResult.reason as Error).message },
    };

    console.log('Cron job executed successfully:', results);
    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
