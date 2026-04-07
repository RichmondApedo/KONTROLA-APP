'use client';

import { HomeBannerCarousel } from '@/components/dashboard/home-banner-carousel';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { DollarSign, ArrowUp, ArrowDown, Target } from 'lucide-react';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, where, Timestamp, doc, limit, orderBy } from 'firebase/firestore';
import type { IncomeSource, Expense, SavingsGoal, CombinedTransaction } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { startOfMonth as getStartOfMonth, endOfMonth as getEndOfMonth } from 'date-fns';
import { ClientOnly } from '@/components/client-only';
import dynamic from 'next/dynamic';
import { CurrencyIcon } from '@/components/dashboard/currency-symbol';

const AddGoalDialog = dynamic(() => import('@/components/dashboard/add-goal-dialog').then(mod => mod.AddGoalDialog));
const UpgradePlanDialog = dynamic(() => import('@/components/dashboard/upgrade-plan-dialog').then(mod => mod.UpgradePlanDialog));
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

import { FinancialHealthCard } from '@/components/dashboard/financial-health-card';
import { StrategicForecastCard } from '@/components/dashboard/strategic-forecast-card';
import { SmartAlerts } from '@/components/dashboard/smart-alerts';
import { MilestoneCelebration } from '@/components/dashboard/milestone-celebration';
import { Sparkles, Activity, ShieldCheck, TrendingUp as TrendingUpIcon } from 'lucide-react';
import { SafeToSaveWidget } from '@/components/dashboard/safe-to-save-widget';


export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile, isProfileLoading } = useUserProfile();

  // --- Date References ---
  const [dateRefs, setDateRefs] = useState(() => {
    const now = new Date();
    return {
      now,
      startOfMonth: getStartOfMonth(now),
      endOfMonth: getEndOfMonth(now),
    };
  });


  // --- GOAL DATA ---
  const savingsGoalQuery = useMemo(
    () =>
      user && firestore
        ? query(collection(firestore, 'users', user.uid, 'savingsGoals'), limit(1))
        : null,
    [user, firestore]
  );
  const { data: savingsGoals, isLoading: isSavingsGoalLoading } = useCollection<SavingsGoal>(savingsGoalQuery);


  // --- DATA FOR KPIs & CHART (Current Month) ---
  const { data: monthlyIncome, isLoading: isMonthlyIncomeLoading } = useCollection<IncomeSource>(
    useMemo(() => user && firestore && dateRefs ? query(collection(firestore, `users/${user.uid}/incomeSources`), where('date', '>=', Timestamp.fromDate(dateRefs.startOfMonth)), where('date', '<=', Timestamp.fromDate(dateRefs.endOfMonth))) : null, [user, firestore, dateRefs])
  );
  const { data: monthlyExpenses, isLoading: isMonthlyExpensesLoading } = useCollection<Expense>(
    useMemo(() => user && firestore && dateRefs ? query(collection(firestore, `users/${user.uid}/expenses`), where('date', '>=', Timestamp.fromDate(dateRefs.startOfMonth)), where('date', '<=', Timestamp.fromDate(dateRefs.endOfMonth))) : null, [user, firestore, dateRefs])
  );
  
  // --- DATA FOR RECENT TRANSACTIONS ---
  const recentIncomeQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/incomeSources`), orderBy('date', 'desc'), limit(5)) : null, [user, firestore]);
  const recentExpensesQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/expenses`), orderBy('date', 'desc'), limit(5)) : null, [user, firestore]);

  const { data: top5Income, isLoading: isTop5IncomeLoading } = useCollection<IncomeSource>(recentIncomeQuery);
  const { data: top5Expenses, isLoading: isTop5ExpensesLoading } = useCollection<Expense>(recentExpensesQuery);
  
  // --- Derived Data Processing (Client-Side) ---
  const currency = profile?.preferredCurrency || 'ghs';
  const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || isAdmin;
  
  // Filter for personal transactions for KPIs and Chart
  const personalMonthlyIncome = useMemo(() => monthlyIncome?.filter(i => i.context !== 'business'), [monthlyIncome]);
  const personalMonthlyExpenses = useMemo(() => monthlyExpenses?.filter(e => e.context !== 'business'), [monthlyExpenses]);

  // Calculations for KPIs
  const totalMonthlyIncome = useMemo(() => personalMonthlyIncome?.reduce((acc, curr) => acc + curr.amount, 0) || 0, [personalMonthlyIncome]);
  const totalMonthlyExpenses = useMemo(() => personalMonthlyExpenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0, [personalMonthlyExpenses]);
  const monthlyNetFlow = totalMonthlyIncome - totalMonthlyExpenses;

  // Filter for personal recent transactions
  const personalTop5Income = useMemo(() => top5Income?.filter(i => i.context !== 'business'), [top5Income]);
  const personalTop5Expenses = useMemo(() => top5Expenses?.filter(e => e.context !== 'business'), [top5Expenses]);

  const recentTransactions = useMemo((): CombinedTransaction[] => {
    if (!personalTop5Income || !personalTop5Expenses) return [];
    const incomeTx = personalTop5Income.map(i => ({ ...i, type: 'income', description: i.name || 'Unnamed Income' } as CombinedTransaction));
    const expenseTx = personalTop5Expenses.map(e => ({ ...e, type: 'expense' } as CombinedTransaction));
    
    return [...incomeTx, ...expenseTx]
      .sort((a, b) => {
        const dateA = (a.date as any).toDate ? (a.date as any).toDate() : new Date(a.date);
        const dateB = (b.date as any).toDate ? (b.date as any).toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [personalTop5Income, personalTop5Expenses]);

  const savingsGoal = useMemo(() => (savingsGoals && savingsGoals.length > 0 ? savingsGoals[0] : null), [savingsGoals]);
  
  const savingsProgress = useMemo(() => {
    if (!savingsGoal || savingsGoal.targetAmount === 0) return 0;
    return (savingsGoal.currentAmount / savingsGoal.targetAmount) * 100;
  }, [savingsGoal]);

  const isKpiLoading = isProfileLoading || isMonthlyIncomeLoading || isMonthlyExpensesLoading || !dateRefs;
  const isChartLoading = isProfileLoading || isMonthlyIncomeLoading || isMonthlyExpensesLoading;
  const isRecentTxLoading = isTop5IncomeLoading || isTop5ExpensesLoading;

  return (
    <div className="space-y-6 relative min-h-screen">
      {/* Premium Unified Background */}
      <div 
          className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] grayscale"
          style={{ 
            backgroundImage: 'url("/images/premium-bg.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
      />

      <div className="relative z-10 space-y-6">
        <MilestoneCelebration />
        <HomeBannerCarousel />
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">Welcome back, {profile?.firstName || 'User'}!</h1>
          <p className="text-muted-foreground">Here's a snapshot of your financial health today.</p>
        </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card shadow-premium border-border/40 overflow-hidden group hover:scale-[1.015] transition-all duration-500 relative bg-emerald-500/[0.02]">
           {/* Background Floating Icon */}
          <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 duration-700">
            <Activity className="h-24 w-24 text-emerald-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Net Liquidity</CardTitle>
             <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CurrencyIcon currency={currency} className="h-4 w-4 text-emerald-500" />
             </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {isKpiLoading ? <Skeleton className="h-8 w-3/4" /> : (
                <div className={cn(
                    "text-2xl sm:text-3xl font-black tracking-tighter",
                    monthlyNetFlow >= 0 ? "text-emerald-500" : "text-destructive"
                )}>
                    {formatCurrency(monthlyNetFlow, currency)}
                </div>
            )}
            <div className="flex items-center gap-1.5 mt-1">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Monthly Maturity Snapshot</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-soft border-border/40 overflow-hidden group hover:scale-[1.015] transition-all duration-500 relative">
          <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:rotate-12 duration-700">
            <TrendingUpIcon className="h-24 w-24 text-primary" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Revenue Inflow</CardTitle>
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <ArrowUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
             {isKpiLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground">{formatCurrency(totalMonthlyIncome, currency)}</div>}
             <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground mt-1">Total Verified Income</p>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-soft border-border/40 overflow-hidden group hover:scale-[1.015] transition-all duration-500 relative">
          <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 duration-700">
            <Activity className="h-24 w-24 text-destructive" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Capital Outflow</CardTitle>
             <div className="h-8 w-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                <ArrowDown className="h-4 w-4 text-destructive" />
             </div>
          </CardHeader>
          <CardContent className="relative z-10">
            {isKpiLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground">{formatCurrency(totalMonthlyExpenses, currency)}</div>}
            <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground mt-1">Maintenance & Obligations</p>
          </CardContent>
        </Card>

        <div className="sm:col-span-2 lg:col-span-1">
          <FinancialHealthCard />
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-8 items-start relative z-10">
        <div className="flex-1 w-full min-w-0">
            <Card className="overflow-hidden bg-background shadow-soft border-border">
                <CardHeader>
                    <CardTitle>This Month's Trends</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <OverviewChart currency={currency} income={personalMonthlyIncome} expenses={personalMonthlyExpenses} isLoading={isChartLoading} dateRefs={dateRefs} />
                </CardContent>
            </Card>
        </div>
        
        <div className="w-full lg:w-80 xl:w-96 shrink-0 space-y-6">
            <SafeToSaveWidget />
            <SmartAlerts />
            <StrategicForecastCard />
        </div>
      </div>

      <div className="relative z-10">
             <Card className="bg-background shadow-soft border-border overflow-hidden">
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
    </div>
  );
}
