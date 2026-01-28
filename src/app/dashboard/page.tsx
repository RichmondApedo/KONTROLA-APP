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
import { subMonths, startOfMonth as getStartOfMonth, endOfMonth as getEndOfMonth } from 'date-fns';
import { AnimatedNumber } from '@/components/dashboard/animated-number';
import { HomeBannerCarousel } from '@/components/dashboard/home-banner-carousel';

type CombinedTransaction = (IncomeSource & { type: 'income' }) | (Expense & { type: 'expense' });

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // --- Date References ---
  // Memoize date calculations to prevent re-running queries on every render
  const dateRefs = useMemo(() => {
    const now = new Date();
    return {
      now,
      sixMonthsAgo: subMonths(now, 5),
      startOfMonth: getStartOfMonth(now),
      endOfMonth: getEndOfMonth(now),
    };
  }, []);

  // --- Data Fetching ---

  // Profile (for currency, plan)
  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);

  // Queries for Total Balance
  const allIncomeQuery = useMemo(
    () => user && firestore
      ? query(collection(firestore, `users/${user.uid}/incomeSources`))
      : null,
    [user, firestore]
  );
  const allExpensesQuery = useMemo(
    () => user && firestore
      ? query(collection(firestore, `users/${user.uid}/expenses`))
      : null,
    [user, firestore]
  );
  const { data: allIncome, isLoading: isAllIncomeLoading } = useCollection<IncomeSource>(allIncomeQuery);
  const { data: allExpenses, isLoading: isAllExpensesLoading } = useCollection<Expense>(allExpensesQuery);


  // Data for KPI cards (current month)
  const monthlyIncomeQuery = useMemo(
    () =>
      user && firestore
        ? query(
            collection(firestore, `users/${user.uid}/incomeSources`),
            where('date', '>=', Timestamp.fromDate(dateRefs.startOfMonth)),
            where('date', '<=', Timestamp.fromDate(dateRefs.endOfMonth))
          )
        : null,
    [user, firestore, dateRefs]
  );
  const { data: monthlyIncome, isLoading: isMonthlyIncomeLoading } = useCollection<IncomeSource>(monthlyIncomeQuery);
  
  const monthlyExpensesQuery = useMemo(
    () =>
      user && firestore
        ? query(
            collection(firestore, `users/${user.uid}/expenses`),
            where('date', '>=', Timestamp.fromDate(dateRefs.startOfMonth)),
            where('date', '<=', Timestamp.fromDate(dateRefs.endOfMonth))
          )
        : null,
    [user, firestore, dateRefs]
  );
  const { data: monthlyExpenses, isLoading: isMonthlyExpensesLoading } = useCollection<Expense>(monthlyExpensesQuery);

  // Data for Recent Transactions list
  const recentIncomeQuery = useMemo(
    () =>
      user && firestore
        ? query(
            collection(firestore, `users/${user.uid}/incomeSources`),
            orderBy('date', 'desc'),
            limit(5)
          )
        : null,
    [user, firestore]
  );
  const recentExpensesQuery = useMemo(
    () =>
      user && firestore
        ? query(
            collection(firestore, `users/${user.uid}/expenses`),
            orderBy('date', 'desc'),
            limit(5)
          )
        : null,
    [user, firestore]
  );

  const { data: recentIncome, isLoading: isRecentIncomeLoading } = useCollection<IncomeSource>(recentIncomeQuery);
  const { data: recentExpenses, isLoading: isRecentExpensesLoading } = useCollection<Expense>(recentExpensesQuery);


  // Data for Overview Chart (last 6 months)
  const chartIncomeQuery = useMemo(
    () =>
      user && firestore
        ? query(
            collection(firestore, `users/${user.uid}/incomeSources`),
            where('date', '>=', Timestamp.fromDate(dateRefs.sixMonthsAgo)),
            where('date', '<=', Timestamp.fromDate(dateRefs.now))
          )
        : null,
    [user, firestore, dateRefs]
  );
  const chartExpensesQuery = useMemo(
    () =>
      user && firestore
        ? query(
            collection(firestore, `users/${user.uid}/expenses`),
            where('date', '>=', Timestamp.fromDate(dateRefs.sixMonthsAgo)),
            where('date', '<=', Timestamp.fromDate(dateRefs.now))
          )
        : null,
    [user, firestore, dateRefs]
  );

  const { data: chartIncome, isLoading: isChartIncomeLoading } = useCollection<IncomeSource>(chartIncomeQuery);
  const { data: chartExpenses, isLoading: isChartExpensesLoading } = useCollection<Expense>(chartExpensesQuery);


  // Data for Savings Goal
  const savingsGoalQuery = useMemo(
    () =>
      user && firestore
        ? query(collection(firestore, 'users', user.uid, 'savingsGoals'), limit(1))
        : null,
    [user, firestore]
  );
  const { data: savingsGoals, isLoading: isSavingsGoalLoading } = useCollection<SavingsGoal>(savingsGoalQuery);

  // --- Loading States ---
  const isKpiLoading = isProfileLoading || isMonthlyIncomeLoading || isMonthlyExpensesLoading || isAllIncomeLoading || isAllExpensesLoading;
  const isRecentTxLoading = isRecentIncomeLoading || isRecentExpensesLoading;
  const isChartLoading = isChartIncomeLoading || isChartExpensesLoading;
  const isGoalsLoading = isSavingsGoalLoading;


  // --- Data Processing ---
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

  const totalMonthlyIncome = useMemo(
    () => monthlyIncome?.reduce((acc, curr) => acc + curr.amount, 0) || 0,
    [monthlyIncome]
  );

  const totalMonthlyExpenses = useMemo(
    () => monthlyExpenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0,
    [monthlyExpenses]
  );

  const recentTransactions = useMemo((): CombinedTransaction[] => {
    if (!recentIncome || !recentExpenses) return [];
    const incomeTx = recentIncome.map(i => ({ ...i, type: 'income', description: i.name } as CombinedTransaction));
    const expenseTx = recentExpenses.map(e => ({ ...e, type: 'expense' } as CombinedTransaction));
    
    return [...incomeTx, ...expenseTx]
      .sort((a, b) => {
        const dateA = (a.date as any).toDate ? (a.date as any).toDate() : new Date(a.date);
        const dateB = (b.date as any).toDate ? (b.date as any).toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [recentIncome, recentExpenses]);

  const savingsGoal = useMemo(() => (savingsGoals && savingsGoals.length > 0 ? savingsGoals[0] : null), [savingsGoals]);
  
  const savingsProgress = useMemo(() => {
    if (!savingsGoal || savingsGoal.targetAmount === 0) return 0;
    return (savingsGoal.currentAmount / savingsGoal.targetAmount) * 100;
  }, [savingsGoal]);

  return (
    <div className="space-y-6">
      <HomeBannerCarousel />
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
            {isKpiLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold"><AnimatedNumber value={totalBalance} currency={currency} /></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <ArrowUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
             {isKpiLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold"><AnimatedNumber value={totalMonthlyIncome} currency={currency} /></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
             <ArrowDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isKpiLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold"><AnimatedNumber value={totalMonthlyExpenses} currency={currency} /></div>}
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
            {isGoalsLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                </div>
            ) : isPremium ? (
                savingsGoal ? (
                    <>
                        <div className="text-2xl font-bold">
                            <AnimatedNumber value={savingsGoal.currentAmount} currency={currency} />
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
            <OverviewChart currency={currency} income={chartIncome} expenses={chartExpenses} isLoading={isChartLoading} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-1 xl:col-span-3">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your 5 most recent transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentTransactions transactions={recentTransactions} isLoading={isRecentTxLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
