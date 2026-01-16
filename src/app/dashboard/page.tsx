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
import { useMemo, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { AddGoalDialog } from '@/components/dashboard/add-goal-dialog';
import { Button } from '@/components/ui/button';
import { UpgradePlanDialog } from '@/components/dashboard/upgrade-plan-dialog';
import { subMonths } from 'date-fns';

type CombinedTransaction = (IncomeSource & { type: 'income' }) | (Expense & { type: 'expense' });

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    const end = new Date();
    const start = subMonths(end, 5);
    setDateRange({ start, end });
  }, []);

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );

  const incomeQuery = useMemo(
    () =>
      user && firestore && dateRange
        ? query(
            collection(firestore, `users/${user.uid}/incomeSources`),
            where('date', '>=', Timestamp.fromDate(dateRange.start)),
            where('date', '<=', Timestamp.fromDate(dateRange.end)),
            orderBy('date', 'asc')
          )
        : null,
    [user, firestore, dateRange]
  );
  
  const expensesQuery = useMemo(
    () =>
      user && firestore && dateRange
        ? query(
            collection(firestore, `users/${user.uid}/expenses`),
            where('date', '>=', Timestamp.fromDate(dateRange.start)),
            where('date', '<=', Timestamp.fromDate(dateRange.end)),
            orderBy('date', 'asc')
          )
        : null,
    [user, firestore, dateRange]
  );

  const savingsGoalQuery = useMemo(
    () =>
      user && firestore
        ? query(collection(firestore, 'users', user.uid, 'savingsGoals'), limit(1))
        : null,
    [user, firestore]
  );

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);
  const { data: income, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
  const { data: savingsGoals, isLoading: savingsGoalLoading } = useCollection<SavingsGoal>(savingsGoalQuery);
  
  const isLoading = incomeLoading || expensesLoading || isProfileLoading || savingsGoalLoading || !dateRange;
  
  const { totalMonthlyIncome, totalMonthlyExpenses } = useMemo(() => {
    if (!income || !expenses) return { totalMonthlyIncome: 0, totalMonthlyExpenses: 0 };
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyIncomeTotal = income
      .filter(i => {
        const itemDate = (i.date as any).toDate ? (i.date as any).toDate() : new Date(i.date);
        return itemDate >= startOfMonth;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);

    const monthlyExpensesTotal = expenses
      .filter(e => {
        const itemDate = (e.date as any).toDate ? (e.date as any).toDate() : new Date(e.date);
        return itemDate >= startOfMonth;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);

    return { totalMonthlyIncome: monthlyIncomeTotal, totalMonthlyExpenses: monthlyExpensesTotal };
  }, [income, expenses]);

  const recentTransactions = useMemo((): CombinedTransaction[] => {
    if (!income || !expenses) return [];

    const incomeTransactions: CombinedTransaction[] = income.map(i => ({...i, type: 'income', description: i.name}));
    const expenseTransactions: CombinedTransaction[] = expenses.map(e => ({...e, type: 'expense'}));

    return [...incomeTransactions, ...expenseTransactions]
      .sort((a, b) => {
        const dateA = (a.date as any).toDate ? (a.date as any).toDate() : new Date(a.date);
        const dateB = (b.date as any).toDate ? (b.date as any).toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [income, expenses]);

  
  const totalBalance = profile?.totalBalance || 0;

  const savingsGoal = useMemo(() => (savingsGoals && savingsGoals.length > 0 ? savingsGoals[0] : null), [savingsGoals]);
  const savingsProgress = useMemo(() => {
    if (!savingsGoal || savingsGoal.targetAmount === 0) return 0;
    return (savingsGoal.currentAmount / savingsGoal.targetAmount) * 100;
  }, [savingsGoal]);
  
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
            <OverviewChart currency={currency} income={income} expenses={expenses} isLoading={isLoading} />
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
