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
  orderBy,
  where,
  Timestamp,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import type { Budget, Expense, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { formatCurrency } from '@/lib/utils';
import { Button } from '../ui/button';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AddBudgetDialog } from './add-budget-dialog';
import { Pencil } from 'lucide-react';

function BudgetCard({ budget }: { budget: Budget }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [claimed, setClaimed] = useState(false);

  const expensesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    
    // The budget dates from Firestore are Timestamps, so we need to convert them to JS Dates for the query.
    const startDate = (budget.startDate as unknown as Timestamp).toDate();
    const endDate = (budget.endDate as unknown as Timestamp).toDate();

    let q = query(
      collection(firestore, 'users', user.uid, 'expenses'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    if (budget.category !== 'Overall') {
        q = query(q, where('category', '==', budget.category));
    }
    
    return q;
  }, [user, firestore, budget]);

  const { data: expenses, isLoading } = useCollection<Expense>(expensesQuery);

  const totalSpent = useMemo(() => {
    return expenses?.reduce((acc, expense) => acc + expense.amount, 0) || 0;
  }, [expenses]);

  const progress = (totalSpent / budget.amount) * 100;
  const isBudgetMet = totalSpent <= budget.amount;
  const isPeriodOver = (budget.endDate as unknown as Timestamp).toDate() < new Date();

  const handleClaimPoints = async () => {
    if (!user || !firestore) return;

    const pointsToAward = 10; // Award 10 points for meeting a budget
    const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
    try {
      await updateDoc(profileRef, {
        points: increment(pointsToAward),
      });
      toast({
        title: 'Points Claimed!',
        description: `You've earned ${pointsToAward} points for sticking to your budget.`,
      });
      setClaimed(true); // Visually disable the button after claiming
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not claim points. Please try again.',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-start justify-between">
        <div>
            <CardTitle className="text-base font-medium">
            <span>{budget.name}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground capitalize">{budget.period}</p>
        </div>
        <AddBudgetDialog currency={budget.currency} budget={budget}>
            <Button variant="ghost" size="icon">
                <Pencil className="h-4 w-4" />
            </Button>
        </AddBudgetDialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
            </div>
        ) : (
        <>
            <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{formatCurrency(totalSpent, budget.currency)}</span>
                {' '} of {formatCurrency(budget.amount, budget.currency)} spent
            </div>
            <Progress value={progress} className="mt-2" />
            {isPeriodOver && isBudgetMet && !claimed && (
                 <Button onClick={handleClaimPoints} size="sm" className="mt-4">
                    Claim 10 Points
                </Button>
            )}
            {isPeriodOver && !isBudgetMet && (
                <p className="text-xs text-destructive mt-2">You went over budget.</p>
            )}
        </>
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
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
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
