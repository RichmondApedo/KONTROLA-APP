'use client';

import { OverviewChart } from '@/components/dashboard/overview-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, ArrowUp, ArrowDown, Target } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, where, Timestamp, doc, limit } from 'firebase/firestore';
import type { IncomeSource, Expense, UserProfile, SavingsGoal } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { AddGoalDialog } from '@/components/dashboard/add-goal-dialog';
import { Button } from '@/components/ui/button';
import { UpgradePlanDialog } from '@/components/dashboard/upgrade-plan-dialog';

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [startOfMonth, setStartOfMonth] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    setStartOfMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);


  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);

  const monthlyIncomeQuery = useMemo(() =>
    user && firestore && startOfMonth
      ? query(
          collection(firestore, 'users', user.uid, 'incomeSources'),
          where('date', '>=', Timestamp.fromDate(startOfMonth))
        )
      : null,
    [user, firestore, startOfMonth]
  );
  
  const monthlyExpensesQuery = useMemo(() =>
    user && firestore && startOfMonth
      ? query(
          collection(firestore, 'users', user.uid, 'expenses'),
          where('date', '>=', Timestamp.fromDate(startOfMonth))
        )
      : null,
      [user, firestore, startOfMonth]
  );
  
  const savingsGoalQuery = useMemo(() =>
    user && firestore
      ? query(collection(firestore, 'users', user.uid, 'savingsGoals'), limit(1))
      : null,
    [user, firestore]
  );

  const { data: monthlyIncome, isLoading: incomeLoading } = useCollection<IncomeSource>(monthlyIncomeQuery);
  const { data: monthlyExpenses, isLoading: expensesLoading } = useCollection<Expense>(monthlyExpensesQuery);
  const { data: savingsGoals, isLoading: savingsGoalLoading } = useCollection<SavingsGoal>(savingsGoalQuery);

  const totalMonthlyIncome = useMemo(() => monthlyIncome?.reduce((acc, curr) => acc + curr.amount, 0) || 0, [monthlyIncome]);
  const totalMonthlyExpenses = useMemo(() => monthlyExpenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0, [monthlyExpenses]);
  
  const totalBalance = profile?.totalBalance || 0;

  const savingsGoal = useMemo(() => (savingsGoals && savingsGoals.length > 0 ? savingsGoals[0] : null), [savingsGoals]);
  const savingsProgress = useMemo(() => {
    if (!savingsGoal || savingsGoal.targetAmount === 0) return 0;
    return (savingsGoal.currentAmount / savingsGoal.targetAmount) * 100;
  }, [savingsGoal]);
  
  const isLoading = incomeLoading || expensesLoading || isProfileLoading || savingsGoalLoading || !startOfMonth;
  const currency = profile?.preferredCurrency || 'USD';
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">Welcome Back!</h1>
        <p className="text-muted-foreground">Here's a snapshot of your financial health.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(totalBalance, currency)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <ArrowUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(totalMonthlyIncome, currency)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
             <ArrowDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(totalMonthlyExpenses, currency)}</div>}
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{savingsGoal && isPremium ? savingsGoal.name : 'Savings Goal'}</CardTitle>
              {isPremium ? (
                <AddGoalDialog currency={currency} goal={savingsGoal}>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Target className="h-4 w-4 text-primary" />
                  </Button>
                </AddGoalDialog>
              ) : (
                <UpgradePlanDialog featureName="Savings Goals">
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Target className="h-4 w-4 text-primary" />
                  </Button>
                </UpgradePlanDialog>
              )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                </div>
            ) : isPremium ? (
                savingsGoal ? (
                    <>
                        <div className="text-2xl font-bold">
                            {formatCurrency(savingsGoal.currentAmount, currency)}
                            <span className="text-base text-muted-foreground"> / {formatCurrency(savingsGoal.targetAmount, currency)}</span>
                        </div>
                        <Progress value={savingsProgress} className="mt-2" />
                    </>
                ) : (
                    <div className="text-center text-muted-foreground py-4">
                        <p>No savings goal set.</p>
                         <AddGoalDialog currency={currency}>
                           <Button variant="link" className="p-0 h-auto mt-1">Set a Goal</Button>
                        </AddGoalDialog>
                    </div>
                )
            ) : (
                <div className="text-center text-muted-foreground py-4">
                    <p>Upgrade to Premium to set goals.</p>
                    <UpgradePlanDialog featureName="Savings Goals">
                        <Button variant="link" className="p-0 h-auto mt-1">Upgrade</Button>
                    </UpgradePlanDialog>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <OverviewChart currency={currency} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-1 xl:col-span-3">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your 5 most recent transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentTransactions />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
