'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AddBudgetDialog } from '@/components/dashboard/add-budget-dialog';
import { BudgetList } from '@/components/dashboard/budget-list';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirestore } from '@/firebase';
import { doc, collection, query, where, Timestamp, writeBatch } from 'firebase/firestore';
import type { UserProfile, Budget, Expense } from '@/lib/types';
import { Award, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UpgradePlanDialog } from '@/components/dashboard/upgrade-plan-dialog';

export default function BudgetPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const profileDocRef = useMemoFirestore(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus';

  const pastBudgetsQuery = useMemoFirestore(() => {
    if (!user || !firestore || !isPremium) return null;
    return query(
        collection(firestore, 'users', user.uid, 'budgets'),
        where('endDate', '<', Timestamp.now())
    );
  }, [user, firestore, isPremium]);

  const { data: pastBudgets } = useCollection<Budget>(pastBudgetsQuery);

  const expensesQuery = useMemoFirestore(() => {
    if (!user || !firestore || !pastBudgets || pastBudgets.length === 0) return null;

    const budgetPeriods = pastBudgets.map(b => ({
      startDate: b.startDate,
      endDate: b.endDate,
    }));
    
    // This is a simplified query. For a large number of budgets, 
    // you might need to fetch expenses for each budget period separately.
    const earliestStartDate = budgetPeriods.reduce((earliest, current) => 
        current.startDate < earliest ? current.startDate : earliest, 
        budgetPeriods[0].startDate
    );

    return query(
        collection(firestore, 'users', user.uid, 'expenses'),
        where('date', '>=', earliestStartDate)
    );
  }, [user, firestore, pastBudgets]);

  const { data: relevantExpenses } = useCollection<Expense>(expensesQuery);

  useEffect(() => {
    if (user && firestore && pastBudgets && relevantExpenses && profile && profileDocRef && pastBudgets.length > 0) {
      let pointsToAward = 0;
      const batch = writeBatch(firestore);

      pastBudgets.forEach(budget => {
        const expensesForBudget = relevantExpenses.filter(expense => {
           const expenseDate = (expense.date as any).toDate ? (expense.date as any).toDate() : new Date(expense.date);
           const budgetStartDate = (budget.startDate as any).toDate ? (budget.startDate as any).toDate() : new Date(budget.startDate);
           const budgetEndDate = (budget.endDate as any).toDate ? (budget.endDate as any).toDate() : new Date(budget.endDate);

           const isInDateRange = expenseDate >= budgetStartDate && expenseDate <= budgetEndDate;
           const isMatchingCategory = budget.category === 'Overall' || expense.category === budget.category;
           
           return isInDateRange && isMatchingCategory;
        });
        
        const totalSpent = expensesForBudget.reduce((sum, exp) => sum + exp.amount, 0);

        if (totalSpent <= budget.amount) {
          pointsToAward += 10;
        }

        // Delete the expired budget
        const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
        batch.delete(budgetRef);
      });

      if (pointsToAward > 0 || pastBudgets.length > 0) {
        const newPoints = (profile.points || 0) + pointsToAward;
        batch.update(profileDocRef, { points: newPoints });

        batch.commit().then(() => {
            if (pointsToAward > 0) {
                toast({
                    title: `You earned ${pointsToAward} points!`,
                    description: "Great job sticking to your budgets. Keep it up!",
                });
            }
        }).catch(console.error);
      }
    }
  }, [user, firestore, pastBudgets, relevantExpenses, profile, profileDocRef, toast]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Budgets
          </h1>
          <p className="text-muted-foreground">
            Create and track your financial budgets to stay on target.
          </p>
        </div>
         {isPremium ? (
          <AddBudgetDialog currency={profile?.preferredCurrency || 'usd'}>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Budget
            </Button>
          </AddBudgetDialog>
        ) : (
          <UpgradePlanDialog featureName="Budgets">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Budget
            </Button>
          </UpgradePlanDialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Budgets</CardTitle>
              <CardDescription>
                Here are your active budgets. Expired budgets are cleared automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPremium ? (
                <BudgetList />
              ) : (
                <div className="text-center text-muted-foreground py-10">
                  <p>Upgrade to Premium to create and track budgets.</p>
                   <UpgradePlanDialog featureName="Budgets">
                        <Button variant="link" className="p-0 h-auto mt-1">Upgrade</Button>
                    </UpgradePlanDialog>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="text-yellow-500" />
                        Reward Points
                    </CardTitle>
                    <CardDescription>Earn points by sticking to your budget!</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    {isProfileLoading ? (
                        <Skeleton className="h-12 w-24 mx-auto" />
                    ) : (
                        <div className="text-5xl font-bold text-primary">{profile?.points || 0}</div>
                    )}
                    <p className="text-muted-foreground mt-1">Points</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
