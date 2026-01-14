'use client';

import { useMemo } from 'react';
import {
  useCollection,
  useFirestore,
  useUser,
} from '@/firebase';
import {
  collection,
  query,
  orderBy,
  doc,
} from 'firebase/firestore';
import type { SavingsGoal, IncomeSource, Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { formatCurrency } from '@/lib/utils';
import { Button } from '../ui/button';
import { AddGoalDialog } from './add-goal-dialog';
import { Pencil, Trash2, Target } from 'lucide-react';
import { Progress } from '../ui/progress';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useMemoFirestore } from '@/firebase/provider';


function DeleteGoalButton({ goalId }: { goalId: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleDelete = async () => {
        if (!user || !firestore) return;
        const goalRef = doc(firestore, 'users', user.uid, 'savingsGoals', goalId);
        deleteDocumentNonBlocking(goalRef);
        toast({
            title: 'Goal Deleted',
            description: 'Your savings goal has been removed.',
        });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this savings goal.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}


function GoalCard({ goal }: { goal: SavingsGoal }) {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span>{goal.name}</span>
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
            <AddGoalDialog currency={goal.currency} goal={goal}>
            <Button variant="ghost" size="icon">
                <Pencil className="h-4 w-4" />
            </Button>
            </AddGoalDialog>
            <DeleteGoalButton goalId={goal.id} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
            {formatCurrency(goal.currentAmount, goal.currency, { notation: 'compact' })} / 
            <span className="text-muted-foreground">{formatCurrency(goal.targetAmount, goal.currency, { notation: 'compact' })}</span>
        </div>
        <Progress value={progress} className="mt-2" />
      </CardContent>
    </Card>
  );
}

interface GoalListProps {
    currency: string;
}

export function GoalList({ currency }: GoalListProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const goalsQuery = useMemoFirestore(
    () =>
      user && firestore
        ? query(
            collection(firestore, 'users', user.uid, 'savingsGoals'),
            orderBy('targetAmount', 'desc')
          )
        : null,
    [user, firestore]
  );
  
  const { data: goals, isLoading: goalsLoading } = useCollection<SavingsGoal>(goalsQuery);
  
  const isLoading = goalsLoading;

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
      {goals && goals.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map(goal => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          No goals created yet. Get started by creating one!
        </div>
      )}
    </div>
  );
}
