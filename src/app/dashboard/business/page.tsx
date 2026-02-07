'use client';

import { useMemo } from 'react';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { UserProfile, IncomeSource, Expense } from '@/lib/types';
import { UpgradePlanDialog } from '@/components/dashboard/upgrade-plan-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown, ArrowUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { AnimatedNumber } from '@/components/dashboard/animated-number';

type CombinedTransaction = (IncomeSource & { type: 'income' }) | (Expense & { type: 'expense' });

export default function BusinessPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);

  const isProPlus = profile?.plan === 'pro-plus';
  const currency = profile?.preferredCurrency || 'USD';

  const businessIncomeQuery = useMemo(
    () => user && firestore && isProPlus
        ? query(collection(firestore, `users/${user.uid}/incomeSources`), where('context', '==', 'business'))
        : null,
    [user, firestore, isProPlus]
  );
  
  const businessExpensesQuery = useMemo(
    () => user && firestore && isProPlus
        ? query(collection(firestore, `users/${user.uid}/expenses`), where('context', '==', 'business'))
        : null,
    [user, firestore, isProPlus]
  );

  const { data: income, isLoading: incomeLoading } = useCollection<IncomeSource>(businessIncomeQuery);
  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(businessExpensesQuery);

  const { totalIncome, totalExpenses } = useMemo(() => {
    if (!income || !expenses) return { totalIncome: 0, totalExpenses: 0 };
    const incomeTotal = income.reduce((acc, curr) => acc + curr.amount, 0);
    const expensesTotal = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    return { totalIncome: incomeTotal, totalExpenses: expensesTotal };
  }, [income, expenses]);

  const recentTransactions = useMemo((): CombinedTransaction[] => {
    if (!income || !expenses) return [];
    const incomeTx = income.map(i => ({ ...i, type: 'income', description: i.name } as CombinedTransaction));
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
  const isLoading = isProfileLoading || incomeLoading || expensesLoading;

  if (isLoading) {
    return <div className="space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-7">
            <Skeleton className="h-96 xl:col-span-4" />
            <Skeleton className="h-96 lg:col-span-1 xl:col-span-3" />
        </div>
    </div>;
  }

  if (!isProPlus) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-bold">Upgrade to Pro Plus</h2>
        <p className="max-w-md text-muted-foreground">
          Business Account Management is an exclusive Pro Plus feature. Upgrade your plan to track your business finances separately.
        </p>
        <UpgradePlanDialog featureName="Business Account Management">
          <Button>Upgrade to Pro Plus</Button>
        </UpgradePlanDialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Business Dashboard</h1>
        <p className="text-muted-foreground">An overview of your business&apos;s financial health.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Business Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold"><AnimatedNumber value={totalBalance} currency={currency} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Business Income</CardTitle>
            <ArrowUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
             <div className="text-xl sm:text-2xl font-bold"><AnimatedNumber value={totalIncome} currency={currency} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Business Expenses</CardTitle>
             <ArrowDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold"><AnimatedNumber value={totalExpenses} currency={currency} /></div>
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
