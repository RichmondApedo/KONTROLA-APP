'use client';

import { useMemo } from 'react';
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
  doc,
} from 'firebase/firestore';
import type { SavingsGoal } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { AddGoalDialog } from './add-goal-dialog';
import { Pencil, Trash2, Target, Plus, Flag, ArrowUpRight, Activity } from 'lucide-react';
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
    const { profile, activeProfileId } = useUserProfile();
    const firestore = useFirestore();
    const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
    const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || isAdmin;
    const { toast } = useToast();

    const isReadOnly = !isPremium;
    if (isReadOnly) return null;

    const targetUid = activeProfileId || user?.uid;

    const handleDelete = async () => {
        if (!user || !firestore || !targetUid) return;
        const goalRef = doc(firestore, 'users', targetUid, 'savingsGoals', goalId);
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


function GoalCard({ goal, isPremium }: { goal: SavingsGoal, isPremium: boolean }) {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
  return (
    <Card className="glass-card shadow-premium border-border/40 group hover:border-primary/50 hover:bg-primary/[0.02] hover:scale-[1.015] transition-all duration-500 overflow-hidden relative">
      {/* Background Floating Icon */}
      <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:rotate-12 duration-700">
        <Target className="h-24 w-24 text-primary" />
      </div>

      <CardHeader className="pb-2 flex-row items-start justify-between relative z-10">
        <div className="space-y-1">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
            <div className={cn(
                "h-1.5 w-1.5 rounded-full",
                progress >= 100 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]"
            )} />
            {goal.name}
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground opacity-40">
            Phase: {goal.isChallenge ? 'Challenge Mode' : 'Standard Accumulation'}
          </CardDescription>
        </div>
         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {isPremium && (
                <>
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
                </>
            )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-2 relative z-10">
        <div>
            <div className="text-3xl font-black tracking-tighter text-foreground flex items-baseline gap-2">
                {formatCurrency(goal.currentAmount, goal.currency, { notation: 'compact' })}
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/30">/ {formatCurrency(goal.targetAmount, goal.currency, { notation: 'compact' })}</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-1">
                Accumulated Reserves
            </p>
        </div>

        <div className="space-y-3">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/20 border border-white/5 shadow-inner">
                <Progress 
                    value={Math.min(progress, 100)} 
                    className="h-full w-full transition-all duration-1000 [&>div]:bg-primary" 
                />
                {/* Glow effect on the bar */}
                <div 
                    className="absolute top-0 left-0 h-full w-full bg-primary/40 opacity-30 blur-md pointer-events-none transition-all duration-1000"
                    style={{ transform: `translateX(${Math.min(progress, 100) - 100}%)` }}
                />
            </div>

            <div className="flex justify-between items-center font-black uppercase tracking-widest text-[9px]">
                <div className="flex items-center gap-1.5">
                    <span className={cn(progress >= 100 ? "text-emerald-500" : "text-primary")}>
                        {progress.toFixed(progress >= 10 ? 0 : 1)}% Secured
                    </span>
                    <Flag className={cn("h-2 w-2", progress >= 100 ? "text-emerald-500" : "text-primary")} />
                </div>
                <div className="text-muted-foreground/40 flex items-center gap-1.5 italic">
                    {formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount), goal.currency, { notation: 'compact' })} Remaining
                    <ArrowUpRight className="h-2 w-2" />
                </div>
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
  const { activeProfileId } = useUserProfile();
  const firestore = useFirestore();

  const targetUid = activeProfileId || user?.uid;

  const goalsQuery = useMemo(
    () =>
      targetUid && firestore
        ? query(
            collection(firestore, 'users', targetUid, 'savingsGoals'),
            orderBy('targetAmount', 'desc')
          )
        : null,
    [targetUid, firestore]
  );
  
  const { data: goals, isLoading: goalsLoading } = useCollection<SavingsGoal>(goalsQuery);
  const { profile } = useUserProfile();
  const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || isAdmin;
  
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
            <GoalCard key={goal.id} goal={goal} isPremium={isPremium} />
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
