'use client';

import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import type { Budget, Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { formatCurrency } from '@/lib/utils';
import { Button } from '../ui/button';
import { AddBudgetDialog } from './add-budget-dialog';
import { Award, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Progress } from '../ui/progress';
import { useToast } from '@/hooks/use-toast';
import { isPast } from 'date-fns';

function BudgetCard({ budget }: { budget: Budget }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [rewardClaimed, setRewardClaimed] = useState(false);

  const expensesQuery = useMemoFirebase(() => {
    if (!user || !firestore || !budget.startDate || !budget.endDate) return null;

    const expensesCollection = collection(firestore, 'users', user.uid, 'expenses');
    
    const queries = [
      where('date', '>=', budget.startDate.toDate()),
      where('date', '<=', budget.endDate.toDate())
    ];

    if (budget.category !== 'Overall') {
      queries.push(where('category', '==', budget.category));
    }

    return query(expensesCollection, ...queries);
  }, [user, firestore, budget]);

  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

  const spentAmount = useMemo(() => {
    return expenses?.reduce((acc, expense) => acc + expense.amount, 0) || 0;
  }, [expenses]);

  const progress = useMemo(() => {
    if (budget.amount === 0) return 0;
    return (spentAmount / budget.amount) * 100;
  }, [spentAmount, budget.amount]);

  const remainingAmount = budget.amount - spentAmount;
  const isUnderBudget = remainingAmount >= 0;
  const isPeriodOver = budget.endDate && isPast(budget.endDate.toDate());

  const handleClaimReward = async () => {
    if (!user || !firestore) return;
    try {
      const userProfileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      await updateDoc(userProfileRef, {
        points: increment(10)
      });
      toast({
        title: 'Reward Claimed!',
        description: 'You earned 10 points for staying on budget!',
      });
      setRewardClaimed(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not claim reward. Please try again.',
      });
      console.error(error);
    }
  };

  if (expensesLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-medium">
            <span>{budget.name}</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {budget.category} ({budget.period})
          </p>
        </div>
        <AddBudgetDialog currency={budget.currency} budget={budget}>
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </AddBudgetDialog>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(spentAmount, budget.currency)}
          <span className="text-sm font-normal text-muted-foreground">
            {' / '}
            {formatCurrency(budget.amount, budget.currency)}
          </span>
        </div>
        <Progress value={progress} className="mt-2" />
         <p className={`text-xs mt-1 ${isUnderBudget ? 'text-muted-foreground' : 'text-destructive'}`}>
          {isUnderBudget
            ? `${formatCurrency(remainingAmount, budget.currency)} remaining`
            : `${formatCurrency(Math.abs(remainingAmount), budget.currency)} over budget`}
        </p>

        {isPeriodOver && isUnderBudget && !rewardClaimed && (
             <Button size="sm" variant="outline" className="mt-4 w-full" onClick={handleClaimReward}>
                <Award className="mr-2 h-4 w-4 text-yellow-500" />
                Claim Reward (10 Points)
            </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function BudgetList() {
  const { user } = useUser();
  const firestore = useFirestore();

  const budgetsQuery = useMemoFirebase(
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
