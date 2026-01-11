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
import { DollarSign, PiggyBank, ArrowUp, ArrowDown } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import type { IncomeSource, Expense, UserProfile } from '@/lib/types';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const now = useMemo(() => new Date(), []);
  const startOfMonth = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);

  const profileDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);

  const monthlyIncomeQuery = useMemoFirebase(() => 
    user && firestore
      ? query(
          collection(firestore, 'users', user.uid, 'incomeSources'),
          where('date', '>=', Timestamp.fromDate(startOfMonth))
        )
      : null,
    [user, firestore, startOfMonth]
  );
  
  const monthlyExpensesQuery = useMemoFirebase(() =>
    user && firestore
      ? query(
          collection(firestore, 'users', user.uid, 'expenses'),
          where('date', '>=', Timestamp.fromDate(startOfMonth))
        )
      : null,
      [user, firestore, startOfMonth]
  );

  const allTimeIncomeQuery = useMemoFirebase(() =>
    user && firestore
      ? query(collection(firestore, 'users', user.uid, 'incomeSources'))
      : null,
    [user, firestore]
  );

  const allTimeExpensesQuery = useMemoFirebase(() =>
    user && firestore
      ? query(collection(firestore, 'users', user.uid, 'expenses'))
      : null,
    [user, firestore]
  );

  const { data: monthlyIncome, isLoading: incomeLoading } = useCollection<IncomeSource>(monthlyIncomeQuery);
  const { data: monthlyExpenses, isLoading: expensesLoading } = useCollection<Expense>(monthlyExpensesQuery);
  const { data: allIncome, isLoading: allIncomeLoading } = useCollection<IncomeSource>(allTimeIncomeQuery);
  const { data: allExpenses, isLoading: allExpensesLoading } = useCollection<Expense>(allTimeExpensesQuery);

  const totalMonthlyIncome = useMemo(() => monthlyIncome?.reduce((acc, curr) => acc + curr.amount, 0) || 0, [monthlyIncome]);
  const totalMonthlyExpenses = useMemo(() => monthlyExpenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0, [monthlyExpenses]);
  
  const totalBalance = useMemo(() => {
    const totalIncome = allIncome?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
    const totalExpenses = allExpenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
    return totalIncome - totalExpenses;
  }, [allIncome, allExpenses]);
  
  const isLoading = incomeLoading || expensesLoading || allIncomeLoading || allExpensesLoading || isProfileLoading;
  const currency = profile?.preferredCurrency || 'USD';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Welcome Back!</h1>
        <p className="text-muted-foreground">Here's a snapshot of your financial health.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(totalBalance, currency)}</div>}
            <p className="text-xs text-muted-foreground">Your net worth</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <div className="flex items-center text-green-500">
                <ArrowUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(totalMonthlyIncome, currency)}</div>}
            <p className="text-xs text-muted-foreground">This month so far</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
             <div className="flex items-center text-red-500">
                <ArrowDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(totalMonthlyExpenses, currency)}</div>}
            <p className="text-xs text-muted-foreground">This month so far</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Goal</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(8554.28, currency)}</div>
            <p className="text-xs text-muted-foreground">75% of {formatCurrency(11400, currency)} goal</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <OverviewChart currency={currency} />
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
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
