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
import type { SavingsGoal } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { AddGoalDialog } from './add-goal-dialog';
import { Pencil, Trash2, Target, Plus } from 'lucide-react';
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
import { UpdateGoalProgressDialog } from './update-goal-progress-dialog';


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
    <Card className="glass-card shadow-premium border-border/40 group hover:border-primary/50 transition-all duration-500 overflow-hidden relative">
      <CardHeader className="pb-2 flex-row items-start justify-between relative z-10">
        <div>
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <div className={cn(
                "h-1.5 w-1.5 rounded-full",
                progress >= 100 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]"
            )} />
            {goal.name}
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-tight opacity-50 mt-0.5">
            Phase: {goal.isChallenge ? 'Challenge Mode' : 'Standard Accumulation'}
          </CardDescription>
        </div>
        <div className="flex items-center gap-1">
            <UpdateGoalProgressDialog goal={goal}>
              <Button variant='ghost' size='icon' className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                <Plus className='h-3.5 w-3.5' />
              </Button>
            </UpdateGoalProgressDialog>
            <AddGoalDialog currency={goal.currency} goal={goal}>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
            </AddGoalDialog>
            <DeleteGoalButton goalId={goal.id} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-2 relative z-10">
        <div>
            <div className="text-3xl font-black tracking-tighter text-foreground">
                {formatCurrency(goal.currentAmount, goal.currency, { notation: 'compact' })}
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2 opacity-40">/ {formatCurrency(goal.targetAmount, goal.currency, { notation: 'compact' })}</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground mt-1">
                Accumulated Reserves
            </p>
        </div>
        <div className="space-y-2">
            <Progress 
                value={Math.min(progress, 100)} 
                className="h-1.5 bg-muted/30 border border-white/5 [&>div]:bg-primary" 
            />
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                <span className="text-emerald-500">
                    {progress.toFixed(0)}% Secured
                </span>
                <span className="text-muted-foreground opacity-50">
                    {formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount), goal.currency, { notation: 'compact' })} Remaining
                </span>
            </div>
        </div>
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

  const goalsQuery = useMemo(
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
