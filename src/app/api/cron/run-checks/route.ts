export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { runBillReminderCheck } from '@/ai/flows/bill-reminder-flow';
import { runBudgetNotificationCheck } from '@/ai/flows/budget-notification-flow';
import { runGoalReminderCheck } from '@/ai/flows/goal-reminder-flow';
import { runExpireSubscriptions } from '@/lib/subscription-expiry';

// Note: This route is forced dynamic.
// Refactored to support both GET and POST, and both Header and Query parameter auth.

async function executeCronChecks(request: Request) {
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get('secret');
  const authHeader = request.headers.get('authorization');
  
  const isAuthorized = 
    authHeader === `Bearer ${process.env.CRON_SECRET}` || 
    (secretParam !== null && secretParam === process.env.CRON_SECRET);

  if (process.env.CRON_SECRET && !isAuthorized && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [billResult, budgetResult, goalResult, expiryResult] = await Promise.allSettled([
      runBillReminderCheck(),
      runBudgetNotificationCheck(),
      runGoalReminderCheck(),
      runExpireSubscriptions(),
    ]);

    const results = {
      bills: billResult.status === 'fulfilled' ? billResult.value : { success: false, message: 'Execution failed.' },
      budgets: budgetResult.status === 'fulfilled' ? budgetResult.value : { success: false, message: 'Execution failed.' },
      goals: goalResult.status === 'fulfilled' ? goalResult.value : { success: false, message: 'Execution failed.' },
      subscriptionExpiry: expiryResult.status === 'fulfilled' ? expiryResult.value : { success: false, message: 'Execution failed.' },
    };

    console.log('Cron job executed successfully:', results);
    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ success: false, error: 'Internal system error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return executeCronChecks(request);
}

export async function POST(request: Request) {
  return executeCronChecks(request);
}

