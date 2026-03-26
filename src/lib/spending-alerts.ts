import { startOfMonth, differenceInDays, endOfMonth } from 'date-fns';
import type { Expense, Budget } from './types';

export interface SpendingAlert {
    id: string;
    type: 'warning' | 'info' | 'success';
    title: string;
    description: string;
    actionLabel?: string;
    actionPath?: string;
}

/**
 * Analyzes expenses and budgets to generate proactive alerts.
 */
export function getSpendingAlerts(expenses: Expense[], budgets: Budget[]): SpendingAlert[] {
    const alerts: SpendingAlert[] = [];
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    const currentDay = differenceInDays(now, monthStart) + 1;

    // Filter for current month personal expenses
    const monthlyExpenses = expenses.filter(e => {
        const date = (e.date as any).toDate ? (e.date as any).toDate() : new Date(e.date);
        return date >= monthStart && e.context !== 'business';
    });

    const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 1. High Velocity Alert
    // If we've spent more than 40% of our typical monthly total in the first 25% of the month
    // (This is a bit complex without historical averages, so we'll use active budgets)
    const overallBudget = budgets.find(b => b.category === 'Overall');
    if (overallBudget) {
        const budgetAmount = overallBudget.amount;
        const burnRate = totalSpent / budgetAmount;
        const timeRate = currentDay / daysInMonth;

        if (burnRate > timeRate * 1.5 && burnRate > 0.2) {
            alerts.push({
                id: 'high-velocity',
                type: 'warning',
                title: 'High Spending Velocity',
                description: `You've used ${Math.round(burnRate * 100)}% of your budget, but we're only ${Math.round(timeRate * 100)}% through the month.`,
                actionLabel: 'Review Expenses',
                actionPath: '/dashboard/expenses'
            });
        }
    }

    // 2. Category Budget Risks
    budgets.forEach(budget => {
        if (budget.category === 'Overall') return;
        
        const catExpenses = monthlyExpenses.filter(e => e.category === budget.category);
        const catSpent = catExpenses.reduce((sum, e) => sum + e.amount, 0);
        const catBurnRate = catSpent / budget.amount;

        if (catBurnRate >= 0.8 && catBurnRate < 1) {
            alerts.push({
                id: `budget-risk-${budget.category}`,
                type: 'info',
                title: `${budget.category} Budget Risk`,
                description: `You've reached 80% of your ${budget.category} budget. Try to pace yourself!`,
                actionLabel: 'Adjust Budget',
                actionPath: '/dashboard/budgets'
            });
        } else if (catBurnRate >= 1) {
            alerts.push({
                id: `budget-exceeded-${budget.category}`,
                type: 'warning',
                title: `${budget.category} Budget Exceeded`,
                description: `You've exceeded your ${budget.category} budget by ${Math.round((catBurnRate - 1) * 100)}%.`,
                actionLabel: 'Manage Budget',
                actionPath: '/dashboard/budgets'
            });
        }
    });

    // 3. Savings Streak (Simplified)
    // No large expenses (> 2% of budget) in the last 3 days
    if (overallBudget) {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(now.getDate() - 3);
        const recentLargeExpenses = monthlyExpenses.filter(e => {
             const date = (e.date as any).toDate ? (e.date as any).toDate() : new Date(e.date);
             return date >= threeDaysAgo && e.amount > (overallBudget.amount * 0.05);
        });

        if (recentLargeExpenses.length === 0 && totalSpent > 0) {
            alerts.push({
                id: 'savings-streak',
                type: 'success',
                title: 'Financial Zen',
                description: "You haven't had any large unexpected expenses in the last 3 days. Great discipline!",
            });
        }
    }

    return alerts;
}
