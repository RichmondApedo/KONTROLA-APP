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
import { 
  DollarSign, 
  ArrowUp, 
  ArrowDown, 
  Target, 
  Info, 
  Settings,
  Sparkles, 
  Activity, 
  ShieldCheck, 
  TrendingUp as TrendingUpIcon 
} from 'lucide-react';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, where, Timestamp, doc, limit, orderBy } from 'firebase/firestore';
import type { IncomeSource, Expense, SavingsGoal, CombinedTransaction, Invoice, Bill } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { startOfMonth as getStartOfMonth, endOfMonth as getEndOfMonth } from 'date-fns';
import { ClientOnly } from '@/components/client-only';
import dynamic from 'next/dynamic';
import { CurrencyIcon } from '@/components/dashboard/currency-symbol';
import { usePeriodMode } from '@/hooks/use-period-mode';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { useFeatureDiscovery } from '@/hooks/use-feature-discovery';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ToastAction } from '@/components/ui/toast';
import { FinancialHealthCard } from '@/components/dashboard/financial-health-card';
import { StrategicForecastCard } from '@/components/dashboard/strategic-forecast-card';
import { SmartAlerts } from '@/components/dashboard/smart-alerts';
import { MilestoneCelebration } from '@/components/dashboard/milestone-celebration';
import { SafeToSaveWidget } from '@/components/dashboard/safe-to-save-widget';
import { WorkingCapitalTerminal } from '@/components/dashboard/working-capital-terminal';

// Dynamic imports
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


export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile, isProfileLoading } = useUserProfile();

  const { 
    periodMode, 
    setPeriodMode, 
    startDate, 
    endDate, 
    customRange, 
    setCustomRange, 
    label 
  } = usePeriodMode(profile);

  // Derive dateRefs for compatibility with existing components and queries
  const dateRefs = useMemo(() => ({
    now: new Date(),
    startOfMonth: startDate, // renamed internally but matches expected prop name
    endOfMonth: endDate
  }), [startDate, endDate]);

  // --- Discovery Logic ---
  const { toast } = useToast();
  const router = useRouter();
  const { shouldShow, markAsDiscovered } = useFeatureDiscovery('pay_cycle', {
    enabled: !!profile && !profile.incomeDate, // Only show if they haven't set an income date
    showIntervalDays: 3,
    maxShows: 5
  });

  useEffect(() => {
    if (shouldShow) {
      toast({
        title: "💡 Pro Tip: Track by Pay Cycle",
        description: "Instead of just calendar months, you can track your cash flow from one payday to the next. Set your income date to unlock this view.",
        action: (
          <ToastAction altText="Setup Now" onClick={() => router.push('/dashboard/settings')}>
            <Settings className="h-4 w-4 mr-2" />
            Setup
          </ToastAction>
        ),
      });
    }
  }, [shouldShow, toast, router]);


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
    useMemo(() => user && firestore && dateRefs ? query(
        collection(firestore, `users/${user.uid}/incomeSources`), 
        where('context', '!=', 'business'),
        orderBy('context'),
        where('date', '>=', Timestamp.fromDate(dateRefs.startOfMonth)), 
        where('date', '<=', Timestamp.fromDate(dateRefs.endOfMonth))
    ) : null, [user, firestore, dateRefs])
  );
  const { data: monthlyExpenses, isLoading: isMonthlyExpensesLoading } = useCollection<Expense>(
    useMemo(() => user && firestore && dateRefs ? query(
        collection(firestore, `users/${user.uid}/expenses`), 
        where('context', '!=', 'business'),
        orderBy('context'),
        where('date', '>=', Timestamp.fromDate(dateRefs.startOfMonth)), 
        where('date', '<=', Timestamp.fromDate(dateRefs.endOfMonth))
    ) : null, [user, firestore, dateRefs])
  );
  
  // --- DATA FOR RECENT TRANSACTIONS ---
  const recentIncomeQuery = useMemo(() => user && firestore ? query(
      collection(firestore, `users/${user.uid}/incomeSources`), 
      where('context', '!=', 'business'),
      orderBy('context'),
      orderBy('date', 'desc'), 
      limit(5)
  ) : null, [user, firestore]);
  const recentExpensesQuery = useMemo(() => user && firestore ? query(
      collection(firestore, `users/${user.uid}/expenses`), 
      where('context', '!=', 'business'),
      orderBy('context'),
      orderBy('date', 'desc'), 
      limit(5)
  ) : null, [user, firestore]);

  const { data: top5Income, isLoading: isTop5IncomeLoading } = useCollection<IncomeSource>(recentIncomeQuery);
  const { data: top5Expenses, isLoading: isTop5ExpensesLoading } = useCollection<Expense>(recentExpensesQuery);
  
  // --- LIQUIDITY DATA ---
  const billsQuery = useMemo(() => user && firestore ? query(
    collection(firestore, `users/${user.uid}/bills`),
    where('context', '==', 'personal')
  ) : null, [user, firestore]);
  
  const { data: bills, isLoading: isBillsLoading } = useCollection<Bill>(billsQuery);
  
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
  
  const { receivables, payables } = useMemo(() => {
    if (!bills) return { receivables: 0, payables: 0 };
    // Personal dashboard focuses on Cash and Personal Bills (Obligations)
    // Business Invoices (Receivables) are excluded from personal liquidity analysis
    const unpaidBills = bills.filter(bill => bill.status === 'unpaid').reduce((acc, bill) => acc + bill.amount, 0);
    return { receivables: 0, payables: unpaidBills };
  }, [bills]);
  
  const isKpiLoading = isProfileLoading || isMonthlyIncomeLoading || isMonthlyExpensesLoading || !dateRefs;
  const isChartLoading = isProfileLoading || isMonthlyIncomeLoading || isMonthlyExpensesLoading;
  const isRecentTxLoading = isTop5IncomeLoading || isTop5ExpensesLoading;
  const isLiquidityLoading = isBillsLoading;

  return (
    <div className="relative min-h-screen pb-12">
      {/* Premium Unified Background Overlay */}
      <div 
          className="fixed inset-0 z-0 pointer-events-none opacity-[0.02] grayscale"
          style={{ 
            backgroundImage: 'url("/images/premium-bg.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
      />

      <div className="relative z-10">
        <MilestoneCelebration />
        <HomeBannerCarousel />

        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border/10 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-headline tracking-tighter text-foreground">
              Terminal Overview
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              Intelligence snapshot for <span className="text-primary font-bold">{profile?.firstName || 'User'}</span> • {periodMode === 'monthly' ? 'Calendar Month' : 'Custom Period'}
            </p>
          </div>
          <PeriodSelector 
            periodMode={periodMode}
            onModeChange={setPeriodMode}
            incomeDate={profile?.incomeDate}
            label={label}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            onDiscovered={markAsDiscovered}
          />
        </div>

      {/* --- TIER 1: CORE PILLARS (3-Column) --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-stretch mt-6">
        {/* Net Liquidity */}
        <Card className="glass-card shadow-premium border-border/40 overflow-hidden group hover:scale-[1.02] transition-all duration-500 relative bg-emerald-500/[0.03] border-l-2 border-l-emerald-500/50">
          <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 duration-700">
            <Activity className="h-24 w-24 text-emerald-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80">Net Liquidity</CardTitle>
             <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shadow-inner">
                <CurrencyIcon currency={currency} className="h-5 w-5 text-emerald-500" />
             </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-4 px-3 sm:px-4 pb-6">
            {isKpiLoading ? <Skeleton className="h-10 w-3/4" /> : (
                <div className={cn(
                    "text-2xl xs:text-3xl lg:text-4xl font-black tracking-tighter truncate",
                    monthlyNetFlow >= 0 ? "text-emerald-500" : "text-destructive"
                )}>
                    {formatCurrency(monthlyNetFlow, currency)}
                </div>
            )}
            <div className="flex items-center gap-2 mt-4 px-2 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10 w-fit">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/70">Health Maturity Secure</span>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Inflow */}
        <Card className="glass-card shadow-premium border-border/40 overflow-hidden group hover:scale-[1.02] transition-all duration-500 relative bg-primary/[0.03] border-l-2 border-l-primary/50">
          <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:rotate-12 duration-700">
            <TrendingUpIcon className="h-24 w-24 text-primary" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Revenue Inflow</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
                <ArrowUp className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-4 px-3 sm:px-4 pb-6">
             {isKpiLoading ? <Skeleton className="h-10 w-3/4" /> : <div className="text-2xl xs:text-3xl lg:text-4xl font-black tracking-tighter text-foreground truncate">{formatCurrency(totalMonthlyIncome, currency)}</div>}
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mt-4 px-2">Total Verified Capital</p>
          </CardContent>
        </Card>

        {/* Capital Outflow */}
        <Card className="glass-card shadow-premium border-border/40 overflow-hidden group hover:scale-[1.02] transition-all duration-500 relative bg-destructive/[0.03] border-l-2 border-l-destructive/50 sm:col-span-2 lg:col-span-1">
          <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 duration-700">
            <Activity className="h-24 w-24 text-destructive" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive/80">Capital Outflow</CardTitle>
             <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shadow-inner">
                <ArrowDown className="h-5 w-5 text-destructive" />
             </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-4 px-3 sm:px-4 pb-6">
            {isKpiLoading ? <Skeleton className="h-10 w-3/4" /> : <div className="text-2xl xs:text-3xl lg:text-4xl font-black tracking-tighter text-foreground truncate">{formatCurrency(totalMonthlyExpenses, currency)}</div>}
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mt-4 px-2">Maintenance & Obligations</p>
          </CardContent>
        </Card>
      </div>

      {/* --- TIER 2: STRATEGIC INTELLIGENCE (2/3 + 1/3 Split) --- */}
      <div className="grid gap-4 lg:grid-cols-12 items-start mt-6">
        {/* Main Chart Card */}
        <div className="lg:col-span-8 space-y-4">
            <Card className="glass-card shadow-premium border-border/40 overflow-hidden bg-background/40 backdrop-blur-2xl">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary/80">Trajectory Analysis</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-tight opacity-40">Cash Flow Trends & Velocity</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pl-2 pb-6">
                    <OverviewChart currency={currency} income={personalMonthlyIncome} expenses={personalMonthlyExpenses} isLoading={isChartLoading} dateRefs={dateRefs} />
                </CardContent>
            </Card>
            
            {/* Recent Transactions - Moved Up for Visibility in Desktop view */}
            <Card className="glass-card shadow-premium border-border/40 overflow-hidden bg-background/40">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary/80">Recent Ledger</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-tight opacity-40">Latest 5 financial events</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pb-8">
                    <RecentTransactions transactions={recentTransactions} isLoading={isRecentTxLoading} />
                </CardContent>
            </Card>
        </div>
        
        {/* Sidebar Intelligence */}
        <div className="lg:col-span-4 space-y-4">
            {/* Health Card */}
            <FinancialHealthCard />
            
            {/* Safe to Save Widget */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-primary rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <SafeToSaveWidget />
            </div>

            {/* Smart Alerts */}
            <div className="pt-2">
               <SmartAlerts />
            </div>

            {/* Dash-Integrated Liquidity Analysis */}
            <div className="pt-2 space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Liquidity Analysis</h3>
                </div>
                {isLiquidityLoading ? <Skeleton className="h-48 w-full rounded-3xl" /> : (
                    <WorkingCapitalTerminal 
                        totalCash={monthlyNetFlow}
                        receivables={receivables}
                        payables={payables}
                        currency={currency}
                    />
                )}
            </div>
        </div>
      </div>

      {/* --- TIER 3: FORECASTING & DEEP DIVES (Bottom Grid) --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 items-stretch mt-6">
            {/* Strategic Forecast Card - Made Wide or specific section */}
            <div className="grid gap-4 lg:grid-cols-1">
                <StrategicForecastCard />
            </div>
      </div>

      </div>
    </div>
  );
}
