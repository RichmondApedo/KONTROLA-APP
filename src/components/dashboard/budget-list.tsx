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

  return (
    <Card>
      <CardHeader className="pb-4 flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-medium">
            <span>{budget.name}</span>
          </CardTitle>
          <CardDescription>
            {budget.category} ({budget.period})
          </CardDescription>
        </div>
        <AddBudgetDialog currency={budget.currency} budget={budget}>
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </AddBudgetDialog>
      </CardHeader>
      <CardContent className="space-y-3">
         {isLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
            </div>
         ) : (
            <div>
                <div className="text-2xl font-bold">
                    {formatCurrency(spentAmount, budget.currency, {notation: 'compact'})}
                    <span className="text-sm font-normal text-muted-foreground"> / {formatCurrency(budget.amount, budget.currency, {notation: 'compact'})}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                    Spent of your budget
                </p>
            </div>
        )}
        <Progress value={progress} className={cn(isOverBudget && '[&>div]:bg-destructive')} />
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

  // Fetch all expenses from the last year. This is inefficient but simple and safe.
  const expensesQuery = useMemo(() => {
    if (!user || !firestore) return null;
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return query(
        collection(firestore, 'users', user.uid, 'expenses'),
        where('date', '>=', Timestamp.fromDate(oneYearAgo))
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

  const getSafeDate = (date: any): Date => {
      if (date instanceof Date) return date;
      if (date && typeof date.toDate === 'function') return date.toDate();
      if (typeof date === 'string' || typeof date === 'number') return new Date(date);
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
