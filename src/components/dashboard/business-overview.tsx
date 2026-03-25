'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import type { IncomeSource, Expense, UserProfile, CombinedTransaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown, ArrowUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import dynamic from 'next/dynamic';

const OverviewChart = dynamic(() => import('@/components/dashboard/overview-chart').then(mod => mod.OverviewChart), {
  loading: () => <Skeleton className="h-[350px] w-full" />,
  ssr: false,
});
const RecentTransactions = dynamic(() => import('@/components/dashboard/recent-transactions').then(mod => mod.RecentTransactions), {
  loading: () => (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  ),
  ssr: false,
});

export function BusinessOverview() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile, isProfileLoading } = useUserProfile();

  const businessIncomeQuery = useMemo(
    () => user && firestore
        ? query(collection(firestore, `users/${user.uid}/incomeSources`), where('context', '==', 'business'))
        : null,
    [user, firestore]
  );
  const businessExpensesQuery = useMemo(
    () => user && firestore
        ? query(collection(firestore, `users/${user.uid}/expenses`), where('context', '==', 'business'))
        : null,
    [user, firestore]
  );

  const { data: income, isLoading: incomeLoading } = useCollection<IncomeSource>(businessIncomeQuery);
  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(businessExpensesQuery);

  const isLoading = isProfileLoading || incomeLoading || expensesLoading;
  const currency = profile?.preferredCurrency || 'ghs';

  const { totalIncome, totalExpenses } = useMemo(() => {
    if (!income || !expenses) return { totalIncome: 0, totalExpenses: 0 };
    const incomeTotal = income.reduce((acc, curr) => acc + curr.amount, 0);
    const expensesTotal = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    return { totalIncome: incomeTotal, totalExpenses: expensesTotal };
  }, [income, expenses]);

  const recentTransactions = useMemo((): CombinedTransaction[] => {
    if (!income || !expenses) return [];
    const incomeTx = income.map(i => ({ ...i, type: 'income', description: i.name || 'Unnamed Income' } as CombinedTransaction));
    const expenseTx = expenses.map(e => ({ ...e, type: 'expense' } as CombinedTransaction));
    return [...incomeTx, ...expenseTx]
      .sort((a, b) => {
        const dateA = (a.date as any).toDate ? (a.date as any).toDate() : new Date(a.date);
        const dateB = (b.date as any).toDate ? (b.date as any).toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [income, expenses]);

  const totalBalance = totalIncome - totalExpenses;

  if (isLoading) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-7">
                <Skeleton className="h-96 xl:col-span-4" />
                <Skeleton className="h-96 lg:col-span-1 xl:col-span-3" />
            </div>
        </div>
    );
  }

  return (
     <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Business Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totalBalance, currency)}</div>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Business Income</CardTitle>
                <ArrowUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totalIncome, currency)}</div>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Business Expenses</CardTitle>
                <ArrowDown className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totalExpenses, currency)}</div>
            </CardContent>
            </Card>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-7">
            <Card className="xl:col-span-4">
            <CardHeader>
                <CardTitle>Business Income vs Expenses</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <OverviewChart currency={currency} income={income} expenses={expenses} isLoading={isLoading} />
            </CardContent>
            </Card>
            <Card className="lg:col-span-1 xl:col-span-3">
            <CardHeader>
                <CardTitle>Recent Business Transactions</CardTitle>
            </CardHeader>
            <CardContent>
                <RecentTransactions transactions={recentTransactions} isLoading={isLoading} />
            </CardContent>
            </Card>
        </div>
     </div>
  );
}
