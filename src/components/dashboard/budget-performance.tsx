'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, cn, preciseRound } from '@/lib/utils';
import type { Budget, Expense } from '@/lib/types';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, Timestamp, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';
import { Target, TrendingUp, TrendingDown, Minus, ShieldAlert } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay } from 'date-fns';

interface BudgetPerformanceProps {
  currency: string;
  expenses: Expense[] | null;
  isLoading: boolean;
  dateRange: DateRange | undefined;
}

// Normalize category aliases so Fuel counts under Transport
const normalizeCategory = (cat: string): string => {
  if (cat?.toLowerCase() === 'fuel') return 'Transport';
  return cat;
};

export function BudgetPerformance({ currency, expenses, isLoading, dateRange }: BudgetPerformanceProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  // Fetch all budgets that overlap with the selected date range
  const budgetsQuery = useMemo(() => {
    if (!user || !firestore || !dateRange?.from) return null;
    return query(
      collection(firestore, 'users', user.uid, 'budgets'),
      orderBy('endDate', 'desc')
    );
  }, [user, firestore, dateRange]);

  const { data: allBudgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);

  // Filter budgets that overlap with selected date range
  const relevantBudgets = useMemo(() => {
    if (!allBudgets || !dateRange?.from) return [];
    const rangeStart = startOfDay(dateRange.from);
    const rangeEnd = endOfDay(dateRange.to || dateRange.from);

    return allBudgets.filter(budget => {
      const budgetStart = (budget.startDate as any)?.toDate ? (budget.startDate as any).toDate() : new Date(budget.startDate);
      const budgetEnd = (budget.endDate as any)?.toDate ? (budget.endDate as any).toDate() : new Date(budget.endDate);
      // Overlap: budget starts before range ends AND budget ends after range starts
      return budgetStart <= rangeEnd && budgetEnd >= rangeStart;
    });
  }, [allBudgets, dateRange]);

  // For each budget, compute actual spending from the provided expenses array
  const performanceData = useMemo(() => {
    if (!relevantBudgets || relevantBudgets.length === 0) return [];

    return relevantBudgets.map(budget => {
      const matchingExpenses = (expenses || []).filter(expense => {
        // Normalize expense category before matching against the budget category
        const normalizedExpenseCategory = normalizeCategory(expense.category);
        if (budget.category !== 'Overall' && normalizedExpenseCategory !== budget.category) return false;
        return true;
      });

      const actual = preciseRound(matchingExpenses.reduce((sum, e) => sum + e.amount, 0));
      const budgetLimit = budget.amount;
      const variance = preciseRound(budgetLimit - actual);
      const percentage = budgetLimit > 0 ? preciseRound((actual / budgetLimit) * 100) : 0;
      const isOverBudget = actual > budgetLimit;
      const isNearLimit = !isOverBudget && percentage > 85;

      return {
        budget,
        actual,
        budgetLimit,
        variance,
        percentage,
        isOverBudget,
        isNearLimit,
        transactionCount: matchingExpenses.length,
      };
    });
  }, [relevantBudgets, expenses]);

  const totalBudgeted = useMemo(() =>
    preciseRound(performanceData.filter(p => p.budget.category !== 'Overall').reduce((s, p) => s + p.budgetLimit, 0)),
    [performanceData]
  );
  const totalActual = useMemo(() =>
    preciseRound(performanceData.filter(p => p.budget.category !== 'Overall').reduce((s, p) => s + p.actual, 0)),
    [performanceData]
  );

  const isDataLoading = isLoading || budgetsLoading;

  if (isDataLoading) {
    return (
      <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
        <CardHeader>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56 mt-2" />
        </CardHeader>
        <CardContent className="space-y-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (performanceData.length === 0) {
    return (
      <Card className="glass-card shadow-premium border-border/40 overflow-hidden opacity-60">
        <CardHeader className="text-center py-12">
          <Target className="mx-auto h-12 w-12 text-muted-foreground/20 mb-4" />
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground/40">No Budget Data</CardTitle>
          <CardDescription className="text-[10px] uppercase tracking-tighter">
            Create budgets in Strategic Planning to see performance here
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="glass-card shadow-premium border-border/40 overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

      <CardHeader className="relative z-10 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
            <Target className="h-3 w-3 text-primary" />
            Budget Performance
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">Live Variance</span>
          </div>
        </div>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">
          Actual spending vs. set budget limits for the selected period
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-1 pt-4">

        {/* Summary Row */}
        <div className="grid grid-cols-3 gap-3 mb-6 p-3 rounded-2xl bg-muted/10 border border-border/20">
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Total Budgeted</p>
            <p className="text-sm font-black tracking-tighter text-foreground">{formatCurrency(totalBudgeted, currency, { notation: 'compact' })}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Total Spent</p>
            <p className={cn("text-sm font-black tracking-tighter", totalActual > totalBudgeted ? "text-destructive" : "text-foreground")}>
              {formatCurrency(totalActual, currency, { notation: 'compact' })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Net Variance</p>
            <p className={cn("text-sm font-black tracking-tighter", (totalBudgeted - totalActual) >= 0 ? "text-emerald-500" : "text-destructive")}>
              {(totalBudgeted - totalActual) >= 0 ? '+' : ''}{formatCurrency(preciseRound(totalBudgeted - totalActual), currency, { notation: 'compact' })}
            </p>
          </div>
        </div>

        {/* Per-Budget Rows */}
        <div className="space-y-5">
          {performanceData.map(({ budget, actual, budgetLimit, variance, percentage, isOverBudget, isNearLimit, transactionCount }) => (
            <div key={budget.id} className="space-y-2 group/budget">
              {/* Label Row */}
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isOverBudget ? "bg-destructive shadow-[0_0_6px_rgba(239,68,68,0.5)] animate-pulse" :
                      isNearLimit ? "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]" :
                      "bg-emerald-500"
                    )} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">
                      {budget.name}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/30 font-bold uppercase tracking-widest text-muted-foreground/50">
                      {budget.category}
                    </span>
                  </div>
                  <p className="text-[9px] font-bold text-muted-foreground/40 mt-0.5 pl-3.5">
                    {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Amount summary */}
                <div className="flex items-baseline gap-1.5 text-right">
                  <span className={cn(
                    "text-sm font-black tracking-tighter",
                    isOverBudget ? "text-destructive" : "text-foreground"
                  )}>
                    {formatCurrency(actual, currency, { notation: 'compact' })}
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground/40">
                    / {formatCurrency(budgetLimit, currency, { notation: 'compact' })}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/20 border border-white/5 shadow-inner">
                <Progress
                  value={Math.min(percentage, 100)}
                  className={cn(
                    "h-full transition-all duration-1000",
                    isOverBudget ? "[&>div]:bg-destructive" :
                    isNearLimit ? "[&>div]:bg-orange-500" :
                    "[&>div]:bg-primary"
                  )}
                />
              </div>

              {/* Stats Row */}
              <div className="flex justify-between items-center">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest flex items-center gap-1",
                  isOverBudget ? "text-destructive" : isNearLimit ? "text-orange-500" : "text-emerald-500"
                )}>
                  {percentage.toFixed(0)}% utilized
                </span>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest flex items-center gap-1",
                  variance < 0 ? "text-destructive" : "text-emerald-500"
                )}>
                  {variance >= 0 ? (
                    <><TrendingDown className="h-2.5 w-2.5" /> {formatCurrency(variance, currency, { notation: 'compact' })} remaining</>
                  ) : (
                    <><ShieldAlert className="h-2.5 w-2.5" /> {formatCurrency(Math.abs(variance), currency, { notation: 'compact' })} over budget</>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
