'use client';

import {
  useCollection,
  useFirestore,
  useUser,
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
import { Pencil } from 'lucide-react';
import { useMemo } from 'react';
import { Progress } from '../ui/progress';

function BudgetCard({ budget, expensesForBudget, isLoading }: { budget: Budget, expensesForBudget: Expense[], isLoading: boolean }) {
  const spentAmount = useMemo(() => {
    if (!expensesForBudget) return 0;
    return expensesForBudget.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expensesForBudget]);

  const progress = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;
  const isOverBudget = spentAmount > budget.amount;
  const isNearLimit = !isOverBudget && progress > 85;

  return (
    <Card className="glass-card shadow-premium border-border/40 group hover:border-primary/50 transition-all duration-500 overflow-hidden relative">
      <CardHeader className="pb-2 flex-row items-start justify-between relative z-10">
        <div>
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <div className={cn(
                "h-1.5 w-1.5 rounded-full animate-pulse",
                isOverBudget ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" : 
                isNearLimit ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" : 
                "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            )} />
            {budget.name}
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-tight opacity-50 mt-0.5">
            {budget.category} • {budget.period}
          </CardDescription>
        </div>
        <AddBudgetDialog currency={budget.currency} budget={budget}>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </AddBudgetDialog>
      </CardHeader>
      <CardContent className="space-y-4 pt-2 relative z-10">
         {isLoading ? (
            <div className="space-y-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-2 w-full rounded-full" />
            </div>
         ) : (
            <>
                <div>
                    <div className="text-3xl font-black tracking-tighter text-foreground">
                        {formatCurrency(spentAmount, budget.currency, {notation: 'compact'})}
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2 opacity-40">/ {formatCurrency(budget.amount, budget.currency, {notation: 'compact'})}</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground mt-1">
                        Utilized Capital
                    </p>
                </div>
                <div className="space-y-2">
                    <Progress 
                        value={Math.min(progress, 100)} 
                        className={cn(
                            "h-1.5 bg-muted/30 border border-white/5",
                            isOverBudget ? "[&>div]:bg-destructive" : 
                            isNearLimit ? "[&>div]:bg-orange-500" : 
                            "[&>div]:bg-primary"
                        )} 
                    />
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                        <span className={cn(
                            isOverBudget ? "text-destructive" : isNearLimit ? "text-orange-500" : "text-emerald-500"
                        )}>
                            {progress.toFixed(0)}% Consumed
                        </span>
                        <span className="text-muted-foreground opacity-50">
                            {formatCurrency(Math.max(0, budget.amount - spentAmount), budget.currency, {notation: 'compact'})} Remaining
                        </span>
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
  const firestore = useFirestore();

  // Fetch all active budgets
  const budgetsQuery = useMemo(
    () =>
      user && firestore
        ? query(
            collection(firestore, 'users', user.uid, 'budgets'),
            where('endDate', '>=', Timestamp.now()),
            orderBy('endDate', 'asc')
          )
        : null,
    [user, firestore]
  );
  const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);

  // Fetch all expenses from the last 3 months for budget calculations.
  const expensesQuery = useMemo(() => {
    if (!user || !firestore) return null;
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return query(
        collection(firestore, 'users', user.uid, 'expenses'),
        where('date', '>=', Timestamp.fromDate(threeMonthsAgo))
    );
  }, [user, firestore]);

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
    <div className="space-y-4">
      {budgets && budgets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map(budget => {
            // Filter expenses for each card here, before rendering the component.
            const expensesForBudget = allExpenses ? allExpenses.filter(expense => {
                const budgetStart = getSafeDate(budget.startDate);
                const budgetEnd = getSafeDate(budget.endDate);
                const expenseDate = getSafeDate(expense.date);
                const isInDateRange = expenseDate >= budgetStart && expenseDate <= budgetEnd;
                if (!isInDateRange) return false;
                return budget.category === 'Overall' || expense.category === budget.category;
            }) : [];

            return (
              <BudgetCard key={budget.id} budget={budget} expensesForBudget={expensesForBudget} isLoading={isLoading} />
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
