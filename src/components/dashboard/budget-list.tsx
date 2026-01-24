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
import { AnimatedNumber } from './animated-number';

function BudgetCard({ budget }: { budget: Budget }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const expensesQuery = useMemo(() => {
    if (!user || !firestore) return null;

    let q = query(
      collection(firestore, 'users', user.uid, 'expenses'),
      where('date', '>=', budget.startDate),
      where('date', '<=', budget.endDate)
    );

    if (budget.category !== 'Overall') {
      q = query(q, where('category', '==', budget.category));
    }

    return q;
  }, [user, firestore, budget.startDate, budget.endDate, budget.category]);

  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

  const spentAmount = useMemo(() => {
    return expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
  }, [expenses]);
  
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
                    <AnimatedNumber value={spentAmount} currency={budget.currency} options={{notation: 'compact'}} />
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

  const budgetsQuery = useMemo(
    () =>
      user && firestore
        ? query(
            collection(firestore, 'users', user.uid, 'budgets'),
            orderBy('endDate', 'desc')
          )
        : null,
    [user, firestore]
  );

  const { data: budgets, isLoading } = useCollection<Budget>(budgetsQuery);

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
            <BudgetCard key={budget.id} budget={budget} />
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
