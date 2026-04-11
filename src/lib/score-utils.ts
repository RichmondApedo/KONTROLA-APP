import { subMonths, getMonth, getYear } from 'date-fns';
import type { IncomeSource, Expense, Budget, SavingsGoal } from './types';
import { preciseRound } from './utils';

// Constants for score calculation
export const SCORE_MAX = 1000;
export const SAVINGS_RATIO_WEIGHT = 0.3;
export const EXPENSE_DISCIPLINE_WEIGHT = 0.3;
export const INCOME_CONSISTENCY_WEIGHT = 0.2;
export const GOAL_ACHIEVEMENT_WEIGHT = 0.2;

export interface ScoreResult {
    score: number;
    savingsRatio: number;
    disciplineRatio: number | null;
    consistencyRatio: number;
    goalAchievementRatio: number | null;
}

/**
 * Calculates the proprietary Kontrola financial health score.
 */
export function calculateKontrolaScore(
    sixMonthIncome: IncomeSource[], 
    allFetchedExpenses: Expense[], 
    completedBudgets: Budget[], 
    savingsGoals: SavingsGoal[]
): ScoreResult {
    // 1. Savings Ratio (last 6 months)
    const sixMonthsAgo = subMonths(new Date(), 6);
    const sixMonthExpenses = allFetchedExpenses.filter(e => {
        const expenseDate = (e.date as any).toDate ? (e.date as any).toDate() : new Date(e.date as string);
        return expenseDate >= sixMonthsAgo;
    });

    const totalIncome = preciseRound(sixMonthIncome.reduce((acc, i) => acc + i.amount, 0));
    const totalSixMonthExpenses = preciseRound(sixMonthExpenses.reduce((acc, e) => acc + e.amount, 0));
    
    const savings = preciseRound(totalIncome - totalSixMonthExpenses);
    const savingsRatio = totalIncome > 0 ? preciseRound(savings / totalIncome, 4) : 0;
    
    let savingsScore = 0;
    if (savingsRatio >= 0.2) savingsScore = 1;
    else if (savingsRatio >= 0.1) savingsScore = 0.75;
    else if (savingsRatio >= 0.05) savingsScore = 0.5;
    else if (savingsRatio >= 0) savingsScore = 0.25;
    else savingsScore = 0;

    // 2. Expense Discipline (based on recently completed budgets)
    let metBudgets = 0;
    if (completedBudgets.length > 0) {
        completedBudgets.forEach(budget => {
            const budgetStartDate = (budget.startDate as any).toDate ? (budget.startDate as any).toDate() : new Date(budget.startDate as any);
            const budgetEndDate = (budget.endDate as any).toDate ? (budget.endDate as any).toDate() : new Date(budget.endDate as any);

            const budgetExpenses = allFetchedExpenses.filter(e => {
                 const expenseDate = (e.date as any).toDate ? (e.date as any).toDate() : new Date(e.date as string);
                 return expenseDate >= budgetStartDate && expenseDate <= budgetEndDate && (budget.category === 'Overall' || e.category === budget.category);
            });
            const totalSpent = preciseRound(budgetExpenses.reduce((sum, e) => sum + e.amount, 0));
            if (totalSpent <= budget.amount) {
                metBudgets++;
            }
        });
    }
    const disciplineScore = completedBudgets.length > 0 ? metBudgets / completedBudgets.length : 0.5;

    // 3. Income Consistency (over last 6 months)
    const monthsWithIncome = new Set();
    sixMonthIncome.forEach(i => {
        const incomeDate = (i.date as any).toDate ? (i.date as any).toDate() : new Date(i.date as string);
        monthsWithIncome.add(`${getYear(incomeDate)}-${getMonth(incomeDate)}`);
    });
    const consistencyScore = monthsWithIncome.size / 6;

    // 4. Goal Achievement
    let goalAchievementScore = 0.5;
    if (savingsGoals && savingsGoals.length > 0) {
        const totalProgress = savingsGoals.reduce((acc, goal) => {
            if (goal.targetAmount > 0) {
                const progress = goal.currentAmount / goal.targetAmount;
                return acc + Math.min(progress, 1);
            }
            return acc;
        }, 0);
        goalAchievementScore = totalProgress / savingsGoals.length;
    }

    const finalScore = 
        (savingsScore * SAVINGS_RATIO_WEIGHT) + 
        (disciplineScore * EXPENSE_DISCIPLINE_WEIGHT) + 
        (consistencyScore * INCOME_CONSISTENCY_WEIGHT) +
        (goalAchievementScore * GOAL_ACHIEVEMENT_WEIGHT);

    return {
        score: Math.round(finalScore * SCORE_MAX),
        savingsRatio: savingsRatio,
        disciplineRatio: completedBudgets.length > 0 ? metBudgets / completedBudgets.length : null,
        consistencyRatio: consistencyScore,
        goalAchievementRatio: savingsGoals && savingsGoals.length > 0 ? goalAchievementScore : null
    };
}

export const getScoreTitle = (score: number) => {
    if (score > 750) return 'Excellent!';
    if (score > 500) return 'Looking Good!';
    return 'Needs Improvement';
};

export const getScoreDescription = (score: number) => {
    if (score > 750) return 'You have a strong financial standing. Keep up the great habits!';
    if (score > 500) return 'You are on the right track. Continue to build healthy financial habits.';
    return 'There are opportunities to improve your financial health.';
};

export const getScoreHslColor = (score: number) => {
    if (score > 750) return 'hsl(var(--chart-1))'; 
    if (score > 500) return 'hsl(45 95% 51%)';    
    return 'hsl(var(--destructive))';            
};
