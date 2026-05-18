'use client';
import { checkIsAdmin } from '@/lib/security-config';

import {
  useCollection,
  useFirestore,
  useUser,
  useUserProfile,
} from '@/firebase';
import {
  collection,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import type { Budget, Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { AddBudgetDialog } from './add-budget-dialog';
import { Pencil, DollarSign, PieChart, Activity, ArrowUpRight, Lock } from 'lucide-react';
import { useMemo } from 'react';
import { Progress } from '../ui/progress';
import { usePeriod } from '../period-provider';
import { format } from 'date-fns';

function BudgetCard({ budget, expensesForBudget, isLoading, isPremium }: { budget: Budget, expensesForBudget: Expense[], isLoading: boolean, isPremium: boolean }) {
  const spentAmount = useMemo(() => {
    if (!expensesForBudget) return 0;
    return expensesForBudget.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expensesForBudget]);

  const progress = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;
  const isOverBudget = spentAmount > budget.amount;
  const isNearLimit = !isOverBudget && progress > 85;

  return (
    <Card className="glass-card shadow-premium border-border/40 group hover:border-primary/50 hover:bg-primary/[0.02] hover:scale-[1.015] transition-all duration-500 overflow-hidden relative">
      {/* Background Floating Icon */}
      <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:rotate-12 duration-700">
        <PieChart className="h-24 w-24 text-primary" />
      </div>

      <CardHeader className="pb-2 flex-row items-start justify-between relative z-10">
        <div className="space-y-1">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
            <div className={cn(
                "h-1.5 w-1.5 rounded-full animate-pulse",
                isOverBudget ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" : 
                isNearLimit ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" : 
                "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            )} />
            {budget.name}
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground opacity-40">
            {budget.category} • {budget.period} • Lifecycle Aware
          </CardDescription>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {isPremium ? (
              <AddBudgetDialog currency={budget.currency} budget={budget}>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </AddBudgetDialog>
            ) : (
                <div className="h-8 w-8 rounded-full bg-muted/20 flex items-center justify-center">
                    <Lock className="h-3 w-3 text-muted-foreground/30" />
                </div>
            )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-2 relative z-10">
         {isLoading ? (
            <div className="space-y-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-2 w-full rounded-full" />
            </div>
         ) : (
            <>
                <div>
                    <div className="text-3xl font-black tracking-tighter text-foreground flex items-baseline gap-2">
                        {formatCurrency(spentAmount, budget.currency, {notation: 'compact'})}
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/30">/ {formatCurrency(budget.amount, budget.currency, {notation: 'compact'})}</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-1">
                        Utilized Capital
                    </p>
                </div>

                <div className="space-y-3">
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/20 border border-white/5 shadow-inner">
                        <Progress 
                            value={Math.min(progress, 100)} 
                            className={cn(
                                "h-full w-full transition-all duration-1000",
                                isOverBudget ? "[&>div]:bg-destructive" : 
                                isNearLimit ? "[&>div]:bg-orange-500" : 
                                "[&>div]:bg-primary"
                            )} 
                        />
                        {/* Glow effect on the bar */}
                        {!isOverBudget && (
                            <div 
                                className={cn(
                                    "absolute top-0 left-0 h-full w-full opacity-30 blur-md pointer-events-none transition-all duration-1000",
                                    isNearLimit ? "bg-orange-500/50" : "bg-primary/50"
                                )}
                                style={{ transform: `translateX(${Math.min(progress, 100) - 100}%)` }}
                            />
                        )}
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 font-black uppercase tracking-widest text-[9px]">
                            <span className={cn(
                                isOverBudget ? "text-destructive" : isNearLimit ? "text-orange-500" : "text-emerald-500"
                            )}>
                                {progress.toFixed(0)}% Consumed
                            </span>
                            <Activity className={cn(
                                "h-2 w-2",
                                isOverBudget ? "text-destructive" : isNearLimit ? "text-orange-500" : "text-emerald-500"
                            )} />
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5 italic">
                            {formatCurrency(Math.max(0, budget.amount - spentAmount), budget.currency, {notation: 'compact'})} Threshold Remaining
                            <ArrowUpRight className="h-2 w-2" />
                        </div>
                    </div>
                </div>
            </>
         )}
      </CardContent>
    </Card>
  );
}

export function BudgetList() {
  const { user } = useUser();
  const { activeProfileId } = useUserProfile();
  const firestore = useFirestore();
  const { personal, business } = usePeriod();
  
  const isDelegate = activeProfileId && user && activeProfileId !== user.uid;
  const { profile } = useUserProfile();
  const isAdmin = checkIsAdmin(profile, user);
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || isAdmin;

  const activeTrack = isDelegate ? business : personal;
  const { startDate: periodStart, endDate: periodEnd, label: periodLabel } = activeTrack;

  const targetUid = activeProfileId || user?.uid;

  // Fetch all active budgets
  const budgetsQuery = useMemo(
    () =>
      targetUid && firestore
        ? query(
            collection(firestore, 'users', targetUid, 'budgets'),
            where('endDate', '>=', Timestamp.now()),
            orderBy('endDate', 'asc')
          )
        : null,
    [targetUid, firestore]
  );
  const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);

  // Fetch all expenses for the selected period
  const expensesQuery = useMemo(() => {
    if (!targetUid || !firestore || !periodStart || !periodEnd) return null;
    return query(
        collection(firestore, 'users', targetUid, 'expenses'),
        where('date', '>=', Timestamp.fromDate(periodStart)),
        where('date', '<=', Timestamp.fromDate(periodEnd))
    );
  }, [targetUid, firestore, periodStart, periodEnd]);

  const { data: allExpenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

  const isLoading = budgetsLoading || expensesLoading;

  if (isLoading && !budgets) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const getSafeDate = (date: Date | Timestamp | string): Date => {
      if (date instanceof Date) return date;
      if (date instanceof Timestamp) return date.toDate();
      if (typeof date === 'string') return new Date(date);
      return new Date(); // Fallback
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary opacity-60" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Active Period: {periodLabel}</h3>
        </div>
      </div>
      {budgets && budgets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map(budget => {
            // Filter expenses for each card based on the SELECTED period, 
            // but also respect the budget's own categorization.
            const expensesForBudget = allExpenses ? allExpenses.filter(expense => {
                // Group 'Fuel' under 'Transport' for budget tracking
                const normalizedExpenseCategory = expense.category?.toLowerCase() === 'fuel' ? 'Transport' : expense.category;
                return budget.category === 'Overall' || normalizedExpenseCategory === budget.category;
            }) : [];

            return (
              <BudgetCard key={budget.id} budget={budget} expensesForBudget={expensesForBudget} isLoading={isLoading} isPremium={isPremium} />
            )
          })}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          No budgets created yet. Get started by creating one!
        </div>
      )}
    </div>
  );
}
