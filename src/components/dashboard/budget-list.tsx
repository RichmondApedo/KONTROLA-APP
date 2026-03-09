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

function BudgetCard({ budget, allExpenses, isLoading: expensesLoading }: { budget: Budget, allExpenses: Expense[] | null, isLoading: boolean }) {
  const spentAmount = useMemo(() => {
    if (!allExpenses) return 0;
    
    // Ensure budget dates are JS Date objects
    const budgetStartDate = (budget.startDate as any).toDate ? (budget.startDate as any).toDate() : new Date(budget.startDate as string);
    const budgetEndDate = (budget.endDate as any).toDate ? (budget.endDate as any).toDate() : new Date(budget.endDate as string);

    // Filter the pre-fetched expenses for this specific budget
    const relevantExpenses = allExpenses.filter(expense => {
        const expenseDate = (expense.date as any).toDate ? (expense.date as any).toDate() : new Date(expense.date as string);
        return expenseDate >= budgetStartDate && 
               expenseDate <= budgetEndDate &&
               (budget.category === 'Overall' || expense.category === budget.category);
    });

    return relevantExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [allExpenses, budget]);
  
  const progress = (spentAmount / budget.amount) * 100;
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
         {expensesLoading ? (
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

  // 1. Fetch all active budgets
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

  // 2. Determine the overall date range from all budgets to fetch expenses efficiently
  const overallDateRange = useMemo(() => {
    if (!budgets || budgets.length === 0) return null;

    // Firestore Timestamps need to be converted to JS Dates for comparison
    let minStartDate = (budgets[0].startDate as any).toDate ? (budgets[0].startDate as any).toDate() : new Date(budgets[0].startDate as string);
    let maxEndDate = (budgets[0].endDate as any).toDate ? (budgets[0].endDate as any).toDate() : new Date(budgets[0].endDate as string);

    for (const budget of budgets) {
        const startDate = (budget.startDate as any).toDate ? (budget.startDate as any).toDate() : new Date(budget.startDate as string);
        const endDate = (budget.endDate as any).toDate ? (budget.endDate as any).toDate() : new Date(budget.endDate as string);
        if (startDate < minStartDate) minStartDate = startDate;
        if (endDate > maxEndDate) maxEndDate = endDate;
    }

    return { start: minStartDate, end: maxEndDate };
  }, [budgets]);
  
  // 3. Fetch all expenses within that single, broad date range
  const expensesQuery = useMemo(() => {
      if (!user || !firestore || !overallDateRange) return null;

      return query(
        collection(firestore, 'users', user.uid, 'expenses'),
        where('date', '>=', overallDateRange.start),
        where('date', '<=', overallDateRange.end)
      );
  }, [user, firestore, overallDateRange]);

  const { data: allExpenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

  // The main loading state depends on budgets. Expenses will stream in and update the cards.
  const isLoading = budgetsLoading;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {budgets && budgets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map(budget => (
            <BudgetCard key={budget.id} budget={budget} allExpenses={allExpenses} isLoading={expensesLoading} />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          No budgets created yet. Get started by creating one!
        </div>
      )}
    </div>
  );
}
