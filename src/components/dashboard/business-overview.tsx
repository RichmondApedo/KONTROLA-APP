'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import type { IncomeSource, Expense, UserProfile, CombinedTransaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown, ArrowUp, Activity, TrendingUp, CreditCard } from 'lucide-react';
import { CurrencyIcon } from './currency-symbol';
import { formatCurrency } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { startOfMonth, endOfMonth } from 'date-fns';
import { WorkingCapitalTerminal } from './working-capital-terminal';
import { Bill, Invoice } from '@/lib/types';

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
  const invoicesQuery = useMemo(
    () => user && firestore
        ? query(collection(firestore, `users/${user.uid}/invoices`))
        : null,
    [user, firestore]
  );
  const billsQuery = useMemo(
    () => user && firestore
        ? query(collection(firestore, `users/${user.uid}/bills`), where('context', '==', 'business'))
        : null,
    [user, firestore]
  );

  const { data: income, isLoading: incomeLoading } = useCollection<IncomeSource>(businessIncomeQuery);
  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(businessExpensesQuery);
  const { data: invoices, isLoading: invoicesLoading } = useCollection<Invoice>(invoicesQuery);
  const { data: bills, isLoading: billsLoading } = useCollection<Bill>(billsQuery);

  const isLoading = isProfileLoading || incomeLoading || expensesLoading || invoicesLoading || billsLoading;
  const currency = profile?.preferredCurrency || 'ghs';

  const { totalIncome, totalExpenses } = useMemo(() => {
    if (!income || !expenses) return { totalIncome: 0, totalExpenses: 0 };
    const incomeTotal = income.reduce((acc, curr) => acc + curr.amount, 0);
    const expensesTotal = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    return { totalIncome: incomeTotal, totalExpenses: expensesTotal };
  }, [income, expenses]);

  const { receivables, payables } = useMemo(() => {
    if (!invoices || !bills) return { receivables: 0, payables: 0 };
    
    const unpaidInvoices = invoices
        .filter(inv => inv.status !== 'paid')
        .reduce((acc, inv) => acc + (inv.totalAmount - (inv.amountPaid || 0)), 0);
        
    const unpaidBills = bills
        .filter(bill => bill.status === 'unpaid')
        .reduce((acc, bill) => acc + bill.amount, 0);
        
    return { receivables: unpaidInvoices, payables: unpaidBills };
  }, [invoices, bills]);

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

  const dateRefs = useMemo(() => ({
    startOfMonth: startOfMonth(new Date()),
    endOfMonth: endOfMonth(new Date())
  }), []);

  if (isLoading) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-7">
                <Skeleton className="h-96 xl:col-span-4" />
                <Skeleton className="h-96 lg:col-span-1 xl:col-span-3" />
            </div>
        </div>
    );
  }

  return (
      <div className="space-y-8">
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="glass-card shadow-premium border-border/40 group hover:border-primary/50 hover:bg-primary/[0.01] hover:scale-[1.015] transition-all duration-500 overflow-hidden relative">
                <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:rotate-12 duration-700">
                    <Activity className="h-24 w-24 text-primary" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                        Net Business Balance
                    </CardTitle>
                    <CurrencyIcon currency={currency} className="h-3.5 w-3.5 text-primary/40 group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent className="relative z-10 pt-4 px-4 pb-6">
                    <div className="text-3xl xs:text-3xl lg:text-4xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors duration-500">
                        {formatCurrency(totalBalance, currency)}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-1 italic">Strategic Liquidity Mapping</p>
                </CardContent>
            </Card>

            <Card className="glass-card shadow-premium border-border/40 group hover:border-emerald-500/50 hover:bg-emerald-500/[0.01] hover:scale-[1.015] transition-all duration-500 overflow-hidden relative">
                <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:rotate-12 duration-700">
                    <TrendingUp className="h-24 w-24 text-emerald-500" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        Gross Revenue
                    </CardTitle>
                    <ArrowUp className="h-3.5 w-3.5 text-emerald-500/40 group-hover:translate-y-[-2px] transition-transform" />
                </CardHeader>
                <CardContent className="relative z-10 pt-4 px-4 pb-6">
                    <div className="text-3xl xs:text-3xl lg:text-4xl font-black tracking-tighter text-foreground group-hover:text-emerald-500 transition-colors duration-500">
                        {formatCurrency(totalIncome, currency)}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/40 mt-1 italic">Prosperity Inflow Tracker</p>
                </CardContent>
            </Card>

            <Card className="glass-card shadow-premium border-border/40 group hover:border-orange-500/50 hover:bg-orange-500/[0.01] hover:scale-[1.015] transition-all duration-500 overflow-hidden relative">
                <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:rotate-12 duration-700">
                    <CreditCard className="h-24 w-24 text-orange-500" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                        Operational Expenses
                    </CardTitle>
                    <ArrowDown className="h-3.5 w-3.5 text-orange-500/40 group-hover:translate-y-[2px] transition-transform" />
                </CardHeader>
                <CardContent className="relative z-10 pt-4 px-4 pb-6">
                    <div className="text-3xl xs:text-3xl lg:text-4xl font-black tracking-tighter text-foreground group-hover:text-orange-500 transition-colors duration-500">
                        {formatCurrency(totalExpenses, currency)}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600/40 mt-1 italic">Efficiency Outflow Mapping</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            <div className="lg:col-span-4">
                <WorkingCapitalTerminal 
                    totalCash={totalIncome - totalExpenses}
                    receivables={receivables}
                    payables={payables}
                    currency={currency}
                />
            </div>
            
            <div className="lg:col-span-3">
                <Card className="glass-card shadow-premium border-border/40 h-full overflow-hidden">
                    <CardHeader className="pb-4 border-b border-border/20">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                             <div className="h-3 w-1 bg-primary rounded-full" />
                             Recent Strategic Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 px-2 sm:px-4">
                        <RecentTransactions transactions={recentTransactions} isLoading={isLoading} />
                    </CardContent>
                </Card>
            </div>
        </div>

        <div className="grid gap-6 grid-cols-1">
            <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cash Flow Dynamics</CardTitle>
                </CardHeader>
                <CardContent className="pl-0 sm:pl-2">
                    <OverviewChart currency={currency} income={income} expenses={expenses} isLoading={isLoading} dateRefs={dateRefs} />
                </CardContent>
            </Card>
        </div>
     </div>
  );
}
