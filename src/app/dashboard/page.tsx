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
import { collection, query, where, Timestamp, doc, limit, orderBy } from 'firebase/firestore';
import type { IncomeSource, Expense, UserProfile, SavingsGoal } from '@/lib/types';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { AddGoalDialog } from '@/components/dashboard/add-goal-dialog';
import { Button } from '@/components/ui/button';
import { UpgradePlanDialog } from '@/components/dashboard/upgrade-plan-dialog';
import { subMonths, startOfMonth as getStartOfMonth, endOfMonth as getEndOfMonth, isWithinInterval } from 'date-fns';
import { AnimatedNumber } from '@/components/dashboard/animated-number';
import { HomeBannerCarousel } from '@/components/dashboard/home-banner-carousel';
import { ClientOnly } from '@/components/client-only';

type CombinedTransaction = (IncomeSource & { type: 'income' }) | (Expense & { type: 'expense' });

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // --- Date References ---
  const dateRefs = useMemo(() => {
    const now = new Date();
    return {
      now,
      sixMonthsAgo: subMonths(now, 5),
      startOfMonth: getStartOfMonth(now),
      endOfMonth: getEndOfMonth(now),
    };
  }, []);

  // --- Primary Data Fetching ---
  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);

  // Fetch ALL income and expenses with just two listeners, ordered by date for recent transactions
  const allIncomeQuery = useMemo(
    () => user && firestore
      ? query(collection(firestore, `users/${user.uid}/incomeSources`), orderBy('date', 'desc'))
      : null,
    [user, firestore]
  );
  const allExpensesQuery = useMemo(
    () => user && firestore
      ? query(collection(firestore, `users/${user.uid}/expenses`), orderBy('date', 'desc'))
      : null,
    [user, firestore]
  );
  
  const { data: allIncome, isLoading: isAllIncomeLoading } = useCollection<IncomeSource>(allIncomeQuery);
  const { data: allExpenses, isLoading: isAllExpensesLoading } = useCollection<Expense>(allExpensesQuery);

  // Savings Goal
  const savingsGoalQuery = useMemo(
    () =>
      user && firestore
        ? query(collection(firestore, 'users', user.uid, 'savingsGoals'), limit(1))
        : null,
    [user, firestore]
  );
  const { data: savingsGoals, isLoading: isSavingsGoalLoading } = useCollection<SavingsGoal>(savingsGoalQuery);

  // --- Loading States ---
  const isLoading = isProfileLoading || isAllIncomeLoading || isAllExpensesLoading || isSavingsGoalLoading;


  // --- Derived Data Processing (Client-Side) ---

  const totalBalance = useMemo(() => {
    if (!allIncome || !allExpenses) return 0;
    const personalIncome = allIncome.filter(i => i.context !== 'business');
    const personalExpenses = allExpenses.filter(e => e.context !== 'business');

    const totalIncomeVal = personalIncome.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpensesVal = personalExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    return totalIncomeVal - totalExpensesVal;
  }, [allIncome, allExpenses]);

  const currency = profile?.preferredCurrency || 'USD';
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus';
  
  const { totalMonthlyIncome, totalMonthlyExpenses } = useMemo(() => {
    const currentMonthInterval = { start: dateRefs.startOfMonth, end: dateRefs.endOfMonth };
    
    const monthlyIncome = allIncome?.filter(item => {
        const itemDate = (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
        return isWithinInterval(itemDate, currentMonthInterval);
    }).reduce((acc, curr) => acc + curr.amount, 0) || 0;

    const monthlyExpenses = allExpenses?.filter(item => {
        const itemDate = (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
        return isWithinInterval(itemDate, currentMonthInterval);
    }).reduce((acc, curr) => acc + curr.amount, 0) || 0;

    return { totalMonthlyIncome: monthlyIncome, totalMonthlyExpenses: monthlyExpenses };

  }, [allIncome, allExpenses, dateRefs]);

  const recentTransactions = useMemo((): CombinedTransaction[] => {
    if (!allIncome || !allExpenses) return [];
    // Since queries are already ordered by date descending, we can just slice
    const incomeTx = allIncome.slice(0, 5).map(i => ({ ...i, type: 'income', description: i.name } as CombinedTransaction));
    const expenseTx = allExpenses.slice(0, 5).map(e => ({ ...e, type: 'expense' } as CombinedTransaction));
    
    return [...incomeTx, ...expenseTx]
      .sort((a, b) => {
        const dateA = (a.date as any).toDate ? (a.date as any).toDate() : new Date(a.date);
        const dateB = (b.date as any).toDate ? (b.date as any).toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [allIncome, allExpenses]);

  const { chartIncome, chartExpenses } = useMemo(() => {
    const chartInterval = { start: dateRefs.sixMonthsAgo, end: dateRefs.now };
    
    const income = allIncome?.filter(item => {
        const itemDate = (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
        return isWithinInterval(itemDate, chartInterval);
    });

    const expenses = allExpenses?.filter(item => {
        const itemDate = (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
        return isWithinInterval(itemDate, chartInterval);
    });

    return { chartIncome: income, chartExpenses: expenses };
  }, [allIncome, allExpenses, dateRefs]);

  const savingsGoal = useMemo(() => (savingsGoals && savingsGoals.length > 0 ? savingsGoals[0] : null), [savingsGoals]);
  
  const savingsProgress = useMemo(() => {
    if (!savingsGoal || savingsGoal.targetAmount === 0) return 0;
    return (savingsGoal.currentAmount / savingsGoal.targetAmount) * 100;
  }, [savingsGoal]);

  return (
    <div className="space-y-6">
      <ClientOnly>
        <HomeBannerCarousel />
      </ClientOnly>
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
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-xl sm:text-2xl font-bold"><AnimatedNumber value={totalBalance} currency={currency} /></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <ArrowUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-xl sm:text-2xl font-bold"><AnimatedNumber value={totalMonthlyIncome} currency={currency} /></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
             <ArrowDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-xl sm:text-2xl font-bold"><AnimatedNumber value={totalMonthlyExpenses} currency={currency} /></div>}
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{savingsGoal && isPremium ? savingsGoal.name : 'Savings Goal'}</CardTitle>
            <ClientOnly>
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
              </ClientOnly>
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
                        <div className="text-xl sm:text-2xl font-bold">
                            <AnimatedNumber value={savingsGoal.currentAmount} currency={currency} />
                            <span className="text-base text-muted-foreground"> / {formatCurrency(savingsGoal.targetAmount, currency)}</span>
                        </div>
                        <Progress value={savingsProgress} className="mt-2" />
                    </>
                ) : (
                    <div className="text-center text-muted-foreground py-4">
                        <p>No savings goal set.</p>
                        <ClientOnly>
                          <AddGoalDialog currency={currency}>
                            <Button variant="link" className="p-0 h-auto mt-1">Set a Goal</Button>
                          </AddGoalDialog>
                        </ClientOnly>
                    </div>
                )
            ) : (
                <div className="text-center text-muted-foreground py-4">
                    <p>Upgrade to Premium to set goals.</p>
                    <ClientOnly>
                      <UpgradePlanDialog featureName="Savings Goals">
                          <Button variant="link" className="p-0 h-auto mt-1">Upgrade</Button>
                      </UpgradePlanDialog>
                    </ClientOnly>
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
            <OverviewChart currency={currency} income={chartIncome} expenses={chartExpenses} isLoading={isLoading} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-1 xl:col-span-3">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your 5 most recent transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentTransactions transactions={recentTransactions} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
