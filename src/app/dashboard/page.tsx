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

  // --- PROFILE & GOAL DATA ---
  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);
  
  const savingsGoalQuery = useMemo(
    () =>
      user && firestore
        ? query(collection(firestore, 'users', user.uid, 'savingsGoals'), limit(1))
        : null,
    [user, firestore]
  );
  const { data: savingsGoals, isLoading: isSavingsGoalLoading } = useCollection<SavingsGoal>(savingsGoalQuery);


  // --- OPTIMIZED DATA FETCHING ---

  // 1. Fetch data for the last 6 months for the initial, fast-loading view.
  const sixMonthIncomeQuery = useMemo(() => 
      user && firestore ? query(
          collection(firestore, `users/${user.uid}/incomeSources`),
          where('date', '>=', Timestamp.fromDate(dateRefs.sixMonthsAgo)),
          orderBy('date', 'desc')
      ) : null,
      [user, firestore, dateRefs.sixMonthsAgo]
  );
  const sixMonthExpensesQuery = useMemo(() =>
      user && firestore ? query(
          collection(firestore, `users/${user.uid}/expenses`),
          where('date', '>=', Timestamp.fromDate(dateRefs.sixMonthsAgo)),
          orderBy('date', 'desc')
      ) : null,
      [user, firestore, dateRefs.sixMonthsAgo]
  );

  const { data: recentIncome, isLoading: isRecentIncomeLoading } = useCollection<IncomeSource>(sixMonthIncomeQuery);
  const { data: recentExpenses, isLoading: isRecentExpensesLoading } = useCollection<Expense>(sixMonthExpensesQuery);

  // 2. Fetch ALL data in the background for the total balance calculation. This doesn't block the UI.
  const allIncomeQuery = useMemo(() => 
      user && firestore ? query(collection(firestore, `users/${user.uid}/incomeSources`)) : null,
      [user, firestore]
  );
  const allExpensesQuery = useMemo(() => 
      user && firestore ? query(collection(firestore, `users/${user.uid}/expenses`)) : null,
      [user, firestore]
  );

  const { data: allIncome } = useCollection<IncomeSource>(allIncomeQuery);
  const { data: allExpenses } = useCollection<Expense>(allExpensesQuery);
  

  // --- Loading States ---
  // The main loading state now only depends on the faster, 6-month queries.
  const isLoading = isProfileLoading || isRecentIncomeLoading || isRecentExpensesLoading || isSavingsGoalLoading;
  
  
  // --- Derived Data Processing (Client-Side) ---
  const currency = profile?.preferredCurrency || 'USD';
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus';

  // Use ALL data for total balance (this will update when available from the background query)
  const personalAllIncome = useMemo(() => allIncome?.filter(i => i.context !== 'business') || [], [allIncome]);
  const personalAllExpenses = useMemo(() => allExpenses?.filter(e => e.context !== 'business') || [], [allExpenses]);

  const totalBalance = useMemo(() => {
      const totalIncomeVal = personalAllIncome.reduce((acc, curr) => acc + curr.amount, 0);
      const totalExpensesVal = personalAllExpenses.reduce((acc, curr) => acc + curr.amount, 0);
      return totalIncomeVal - totalExpensesVal;
  }, [personalAllIncome, personalAllExpenses]);

  // Use RECENT data (last 6 months) for monthly stats, chart, and recent transactions list
  const personalRecentIncome = useMemo(() => recentIncome?.filter(i => i.context !== 'business') || [], [recentIncome]);
  const personalRecentExpenses = useMemo(() => recentExpenses?.filter(e => e.context !== 'business') || [], [recentExpenses]);

  const { totalMonthlyIncome, totalMonthlyExpenses } = useMemo(() => {
    const currentMonthInterval = { start: dateRefs.startOfMonth, end: dateRefs.endOfMonth };
    
    // This calculation is now based on the faster 6-month query result
    const monthlyIncome = personalRecentIncome.filter(item => {
        const itemDate = (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
        return isWithinInterval(itemDate, currentMonthInterval);
    }).reduce((acc, curr) => acc + curr.amount, 0) || 0;

    const monthlyExpenses = personalRecentExpenses.filter(item => {
        const itemDate = (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
        return isWithinInterval(itemDate, currentMonthInterval);
    }).reduce((acc, curr) => acc + curr.amount, 0) || 0;

    return { totalMonthlyIncome: monthlyIncome, totalMonthlyExpenses: monthlyExpenses };

  }, [personalRecentIncome, personalRecentExpenses, dateRefs]);

  const recentExpensesList = useMemo((): CombinedTransaction[] => {
    // The query is already ordered by date desc, so we can just take the first 5
    return personalRecentExpenses
      .slice(0, 5)
      .map(e => ({ ...e, type: 'expense' } as CombinedTransaction));
  }, [personalRecentExpenses]);

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
            {/* This will animate from 0 to the final value once all data is loaded */}
            <div className="text-xl sm:text-2xl font-bold"><AnimatedNumber value={totalBalance} currency={currency} /></div>
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
            <OverviewChart currency={currency} income={personalRecentIncome} expenses={personalRecentExpenses} isLoading={isLoading} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-1 xl:col-span-3">
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Your 5 most recent expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentTransactions transactions={recentExpensesList} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
