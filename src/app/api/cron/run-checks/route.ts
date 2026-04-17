export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { runBillReminderCheck } from '@/ai/flows/bill-reminder-flow';
import { runBudgetNotificationCheck } from '@/ai/flows/budget-notification-flow';
import { runGoalReminderCheck } from '@/ai/flows/goal-reminder-flow';

// Note: This route is forced static for the Capacitor build. 
// For real server-side execution, this logic would need to be moved to a standalone function/worker.

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
      bills: billResult.status === 'fulfilled' ? billResult.value : { success: false, message: 'Execution failed.' },
      budgets: budgetResult.status === 'fulfilled' ? budgetResult.value : { success: false, message: 'Execution failed.' },
      goals: goalResult.status === 'fulfilled' ? goalResult.value : { success: false, message: 'Execution failed.' },
    };

    console.log('Cron job executed successfully:', results);
    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ success: false, error: 'Internal system error' }, { status: 500 });
  }
}

