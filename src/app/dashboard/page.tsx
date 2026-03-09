'use client';

import { HomeBannerCarousel } from '@/components/dashboard/home-banner-carousel';
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
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, where, Timestamp, doc, limit, orderBy } from 'firebase/firestore';
import type { IncomeSource, Expense, SavingsGoal } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { AddGoalDialog } from '@/components/dashboard/add-goal-dialog';
import { Button } from '@/components/ui/button';
import { UpgradePlanDialog } from '@/components/dashboard/upgrade-plan-dialog';
import { subMonths, startOfMonth as getStartOfMonth, endOfMonth as getEndOfMonth } from 'date-fns';
import { ClientOnly } from '@/components/client-only';

type CombinedTransaction = (IncomeSource & { type: 'income' }) | (Expense & { type: 'expense' });

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile, isProfileLoading } = useUserProfile();

  // --- Date References ---
  const [dateRefs, setDateRefs] = useState<{
    now: Date;
    sixMonthsAgo: Date;
    startOfMonth: Date;
    endOfMonth: Date;
  } | null>(null);

  useEffect(() => {
    const now = new Date();
    setDateRefs({
      now,
      sixMonthsAgo: subMonths(now, 5),
      startOfMonth: getStartOfMonth(now),
      endOfMonth: getEndOfMonth(now),
    });
  }, []);

  // --- GOAL DATA ---
  const savingsGoalQuery = useMemo(
    () =>
      user && firestore
        ? query(collection(firestore, 'users', user.uid, 'savingsGoals'), limit(1))
        : null,
    [user, firestore]
  );
  const { data: savingsGoals, isLoading: isSavingsGoalLoading } = useCollection<SavingsGoal>(savingsGoalQuery);


  // --- 6-MONTH DATA FOR CHART & NET FLOW ---
  const sixMonthIncomeQuery = useMemo(() => 
      user && firestore && dateRefs ? query(
          collection(firestore, `users/${user.uid}/incomeSources`),
          where('context', '!=', 'business'),
          where('date', '>=', Timestamp.fromDate(dateRefs.sixMonthsAgo)),
          orderBy('date', 'desc')
      ) : null,
      [user, firestore, dateRefs]
  );
  const sixMonthExpensesQuery = useMemo(() =>
      user && firestore && dateRefs ? query(
          collection(firestore, `users/${user.uid}/expenses`),
          where('context', '!=', 'business'),
          where('date', '>=', Timestamp.fromDate(dateRefs.sixMonthsAgo)),
          orderBy('date', 'desc')
      ) : null,
      [user, firestore, dateRefs]
  );

  const { data: recentIncome, isLoading: isRecentIncomeLoading } = useCollection<IncomeSource>(sixMonthIncomeQuery);
  const { data: recentExpenses, isLoading: isRecentExpensesLoading } = useCollection<Expense>(sixMonthExpensesQuery);

  // --- CURRENT MONTH DATA FOR KPIs ---
  const monthlyIncomeQuery = useMemo(() =>
      user && firestore && dateRefs ? query(
          collection(firestore, `users/${user.uid}/incomeSources`),
          where('context', '!=', 'business'),
          where('date', '>=', Timestamp.fromDate(dateRefs.startOfMonth)),
          where('date', '<=', Timestamp.fromDate(dateRefs.endOfMonth))
      ) : null,
      [user, firestore, dateRefs]
  );
  const monthlyExpensesQuery = useMemo(() =>
      user && firestore && dateRefs ? query(
          collection(firestore, `users/${user.uid}/expenses`),
          where('context', '!=', 'business'),
          where('date', '>=', Timestamp.fromDate(dateRefs.startOfMonth)),
          where('date', '<=', Timestamp.fromDate(dateRefs.endOfMonth))
      ) : null,
      [user, firestore, dateRefs]
  );
  
  const { data: monthlyIncome, isLoading: isMonthlyIncomeLoading } = useCollection<IncomeSource>(monthlyIncomeQuery);
  const { data: monthlyExpenses, isLoading: isMonthlyExpensesLoading } = useCollection<Expense>(monthlyExpensesQuery);
  
  
  // --- Derived Data Processing (Client-Side) ---
  const currency = profile?.preferredCurrency || 'ghs';
  const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || isAdmin;

  // Use the larger 6-month dataset for this calculation
  const sixMonthNetFlow = useMemo(() => {
    const totalIncomeVal = recentIncome?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
    const totalExpensesVal = recentExpenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
    return totalIncomeVal - totalExpensesVal;
  }, [recentIncome, recentExpenses]);

  // Use the specific, faster-loading monthly data for these KPIs
  const totalMonthlyIncome = useMemo(() => monthlyIncome?.reduce((acc, curr) => acc + curr.amount, 0) || 0, [monthlyIncome]);
  const totalMonthlyExpenses = useMemo(() => monthlyExpenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0, [monthlyExpenses]);


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

  const isKpiLoading = isProfileLoading || isRecentIncomeLoading || isRecentExpensesLoading || isMonthlyIncomeLoading || isMonthlyExpensesLoading || !dateRefs;
  const isChartLoading = isProfileLoading || isRecentIncomeLoading || isRecentExpensesLoading;

  return (
    <div className="space-y-6">
      <HomeBannerCarousel />
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">Welcome back, {profile?.firstName || 'User'}!</h1>
        <p className="text-muted-foreground">Here's a snapshot of your financial health today.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">6-Month Net Flow</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isKpiLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-xl sm:text-2xl font-bold">{formatCurrency(sixMonthNetFlow, currency)}</div>}
            <p className="text-xs text-muted-foreground">Income minus expenses in the last 6 months</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <ArrowUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
             {isKpiLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totalMonthlyIncome, currency)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
             <ArrowDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isKpiLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totalMonthlyExpenses, currency)}</div>}
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
            {isProfileLoading || isSavingsGoalLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                </div>
            ) : isPremium ? (
                savingsGoal ? (
                    <>
                        <div className="text-xl sm:text-2xl font-bold">
                            {formatCurrency(savingsGoal.currentAmount, currency)}
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
            <OverviewChart currency={currency} income={recentIncome} expenses={recentExpenses} isLoading={isChartLoading} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-1 xl:col-span-3">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your 5 most recent transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentTransactions transactions={recentTransactions} isLoading={isRecentIncomeLoading || isRecentExpensesLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
