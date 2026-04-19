'use client';

import { HomeBannerCarousel } from '@/components/dashboard/home-banner-carousel';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency, cn, preciseRound } from '@/lib/utils';
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
  Lock,
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
import Link from 'next/link';
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
import { WorkingCapitalDashboard } from '@/components/dashboard/working-capital-dashboard';
import { NotificationEnrollment } from '@/components/dashboard/notification-enrollment';

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
  const userProfile = useUserProfile();
  const { profile, isProfileLoading, activeProfileId, activeProfile } = userProfile;

  const isDelegate = activeProfileId && user && activeProfileId !== user.uid;

  const { 
    periodMode, 
    setPeriodMode, 
    startDate, 
    endDate, 
    customRange, 
    setCustomRange, 
    label 
  } = usePeriodMode(activeProfile || profile);

  // Derive dateRefs for compatibility with existing components and queries
  const dateRefs = useMemo(() => ({
    now: new Date(),
    startOfMonth: startDate, // renamed internally but matches expected prop name
    endOfMonth: endDate
  }), [startDate, endDate]);

  const targetUid = activeProfileId || user?.uid;

  // --- Discovery Logic ---
  const { toast } = useToast();
  const router = useRouter();
  const { shouldShow, markAsDiscovered } = useFeatureDiscovery('pay_cycle', {
    enabled: !!activeProfile && !activeProfile.incomeDate, // Only show if they haven't set an income date
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

  if (isDelegate) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="h-32 w-32 rounded-[2.5rem] bg-emerald-500/10 flex items-center justify-center shadow-inner border border-emerald-500/20 relative group">
                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full opacity-50 animate-pulse" />
                <ShieldCheck className="h-16 w-16 text-emerald-500 relative z-10" />
            </div>
            <div className="space-y-3">
                <h1 className="text-4xl font-black font-headline tracking-tight text-primary">Privacy Shield Active</h1>
                <p className="text-muted-foreground font-medium max-w-lg mx-auto text-lg leading-relaxed">
                    You are currently viewing a shared workspace. This primary dashboard contains sensitive personal financial data restricted to the account owner.
                </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="rounded-2xl font-black uppercase tracking-widest text-xs h-14 px-8 bg-primary shadow-xl shadow-primary/20">
                    <Link href="/dashboard/business">Open Business Sidebar</Link>
                </Button>
            </div>
            <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 pt-4">
                <Lock className="h-3.5 w-3.5" /> High-Fidelity Data Protection
            </div>
        </div>
    );
  }


  // --- GOAL DATA ---
  const savingsGoalQuery = useMemo(
    () =>
      targetUid && firestore
        ? query(collection(firestore, 'users', targetUid, 'savingsGoals'), limit(1))
        : null,
    [targetUid, firestore]
  );
  const { data: savingsGoals, isLoading: isSavingsGoalLoading } = useCollection<SavingsGoal>(savingsGoalQuery);


  // --- DATA FOR KPIs & CHART (Current Month) ---
  const { data: allMonthlyIncome, isLoading: isMonthlyIncomeLoading } = useCollection<IncomeSource>(
    useMemo(() => targetUid && firestore && dateRefs ? query(
        collection(firestore, `users/${targetUid}/incomeSources`), 
        where('date', '>=', Timestamp.fromDate(dateRefs.startOfMonth)), 
        where('date', '<=', Timestamp.fromDate(dateRefs.endOfMonth)),
        orderBy('date', 'desc')
    ) : null, [targetUid, firestore, dateRefs])
  );
  const { data: allMonthlyExpenses, isLoading: isMonthlyExpensesLoading } = useCollection<Expense>(
    useMemo(() => targetUid && firestore && dateRefs ? query(
        collection(firestore, `users/${targetUid}/expenses`), 
        where('date', '>=', Timestamp.fromDate(dateRefs.startOfMonth)), 
        where('date', '<=', Timestamp.fromDate(dateRefs.endOfMonth)),
        orderBy('date', 'desc')
    ) : null, [targetUid, firestore, dateRefs])
  );
  
  // Filter for personal transactions for KPIs and Chart
  const personalMonthlyIncome = useMemo(() => allMonthlyIncome?.filter(i => i.context !== 'business'), [allMonthlyIncome]);
  const personalMonthlyExpenses = useMemo(() => allMonthlyExpenses?.filter(e => e.context !== 'business'), [allMonthlyExpenses]);

  // --- DATA FOR RECENT TRANSACTIONS ---
  const recentIncomeQuery = useMemo(() => targetUid && firestore ? query(
      collection(firestore, `users/${targetUid}/incomeSources`), 
      orderBy('date', 'desc'), 
      limit(20) // Fetch more to ensure we have enough after context filtering
  ) : null, [targetUid, firestore]);
  const recentExpensesQuery = useMemo(() => targetUid && firestore ? query(
      collection(firestore, `users/${targetUid}/expenses`), 
      orderBy('date', 'desc'), 
      limit(20)
  ) : null, [targetUid, firestore]);

  const { data: qIncome, isLoading: isTop5IncomeLoading } = useCollection<IncomeSource>(recentIncomeQuery);
  const { data: qExpenses, isLoading: isTop5ExpensesLoading } = useCollection<Expense>(recentExpensesQuery);
  
  // Filter for personal recent transactions
  const personalTop5Income = useMemo(() => qIncome?.filter(i => i.context !== 'business').slice(0, 5), [qIncome]);
  const personalTop5Expenses = useMemo(() => qExpenses?.filter(e => e.context !== 'business').slice(0, 5), [qExpenses]);
  const billsQuery = useMemo(() => targetUid && firestore ? query(
    collection(firestore, `users/${targetUid}/bills`),
    where('context', '==', 'personal')
  ) : null, [targetUid, firestore]);
  
  const { data: bills, isLoading: isBillsLoading } = useCollection<Bill>(billsQuery);
  
  // --- Derived Data Processing (Client-Side) ---
  const currency = activeProfile?.preferredCurrency || 'ghs';
  const isAdmin = activeProfile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
  const isPremium = activeProfile?.plan === 'premium' || activeProfile?.plan === 'pro-plus' || isAdmin;
  
  // Calculations for KPIs
  const totalMonthlyIncome = useMemo(() => preciseRound(personalMonthlyIncome?.reduce((acc, curr) => acc + curr.amount, 0) || 0), [personalMonthlyIncome]);
  const totalMonthlyExpenses = useMemo(() => preciseRound(personalMonthlyExpenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0), [personalMonthlyExpenses]);
  const monthlyNetFlow = preciseRound(totalMonthlyIncome - totalMonthlyExpenses);

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
    return { receivables: 0, payables: preciseRound(unpaidBills) };
  }, [bills]);
  
    const isKpiLoading = isProfileLoading || isMonthlyIncomeLoading || isMonthlyExpensesLoading || !dateRefs;
    const isChartLoading = isProfileLoading || isMonthlyIncomeLoading || isMonthlyExpensesLoading;
    const isRecentTxLoading = isTop5IncomeLoading || isTop5ExpensesLoading;
    const isLiquidityLoading = isBillsLoading;

    // Expert UI/UX Greeting Logic
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        const name = profile?.firstName || 'User';
        if (hour < 12) return `Good Morning, ${name}`;
        if (hour < 17) return `Good Afternoon, ${name}`;
        return `Good Evening, ${name}`;
    }, [profile?.firstName]);

    return (
        <div className="relative min-h-screen pb-32 sm:pb-40">
            {/* Premium Unified Background Overlay */}
            <div 
                className="fixed inset-0 z-0 pointer-events-none opacity-[0.02] grayscale"
                style={{ 
                    backgroundImage: 'url("/images/premium-bg.png")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />

            <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
                <div className="px-4 sm:px-0">
                    <MilestoneCelebration />
                </div>
            </div>

            {/* BALANCED IMMERSIVE BANNER (High-Fidelity Surface) */}
            <div className="relative w-[100vw] left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -mt-16 lg:w-full lg:left-0 lg:right-0 lg:ml-0 lg:mr-0 lg:mt-0 mb-10 sm:mb-16 overflow-hidden shadow-2xl">
                <HomeBannerCarousel />
            </div>

            <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
                {/* --- EXPERT HEADER SECTION --- */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-8 pb-10 border-b border-border/10 relative">
                    <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">System Ready</span>
                        </div>
                        <h1 className="text-[clamp(1.75rem,7vw,4.5rem)] font-black font-headline tracking-tighter text-foreground leading-[0.85] sm:leading-[0.9]">
                            {greeting}
                        </h1>
                        <p className="text-muted-foreground text-xs sm:text-sm font-bold uppercase tracking-widest opacity-60">
                            Cashflow Intelligence • <span className="text-primary">{label}</span>
                        </p>
                    </div>
                    <div className="shrink-0">
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
                </div>

                {/* Notification Pulse Enrollment */}
                <div className="mt-8 mb-4 px-4 sm:px-0">
                    <NotificationEnrollment />
                </div>

                {/* --- THE COMMAND STRIP (KPIs) --- */}
                <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 items-stretch mt-8 mb-10">
                    {/* Net Liquidity - High Impact */}
                    <Card className="glass-card shadow-premium border-border/40 overflow-hidden group hover:scale-[1.015] transition-all duration-500 relative bg-emerald-500/[0.04] border-l-2 border-l-emerald-500/50 col-span-1 xs:col-span-2 lg:col-span-1">
                        <div className="absolute -right-6 -top-6 p-10 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 duration-1000">
                            <Activity className="h-28 w-28 text-emerald-500" />
                        </div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 relative z-10 px-4 sm:px-6">
                            <CardTitle className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] text-emerald-600/70">Available Cash</CardTitle>
                            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shadow-inner group-hover:bg-emerald-500/20 transition-colors">
                                <CurrencyIcon currency={currency} className="h-4 w-4 text-emerald-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10 pt-2 sm:pt-4 px-4 sm:px-6 pb-6">
                            {isKpiLoading ? <Skeleton className="h-10 w-3/4" /> : (
                                <div className={cn(
                                    "text-[clamp(1.5rem,8vw,3rem)] sm:text-4xl lg:text-5xl font-black tracking-tighter truncate leading-none",
                                    monthlyNetFlow >= 0 ? "text-emerald-500" : "text-destructive"
                                )}>
                                    {formatCurrency(monthlyNetFlow, currency)}
                                </div>
                            )}
                            <div className="flex items-center gap-2 mt-5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit backdrop-blur-md">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Health Secure</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Revenue Inflow - Condensed on Mobile */}
                    <Card className="glass-card shadow-premium border-border/20 overflow-hidden group hover:scale-[1.015] transition-all duration-500 relative bg-primary/[0.03] border-l-2 border-l-primary/40">
                        <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:rotate-12 duration-1000">
                            <ArrowDown className="h-20 w-20 text-primary" />
                        </div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 relative z-10 px-3 sm:px-6">
                            <CardTitle className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-primary/60">Revenue</CardTitle>
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shadow-inner group-hover:bg-primary/20 transition-colors">
                                <ArrowDown className="h-4 w-4 text-primary" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10 pt-2 sm:pt-4 px-3 sm:px-6 pb-6">
                            {isKpiLoading ? <Skeleton className="h-8 w-full" /> : (
                                <div className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-foreground truncate leading-none">
                                    {formatCurrency(totalMonthlyIncome, currency)}
                                </div>
                            )}
                            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 mt-4 px-1">Total Inflow</p>
                        </CardContent>
                    </Card>

                    {/* Capital Outflow - Condensed on Mobile */}
                    <Card className="glass-card shadow-premium border-border/20 overflow-hidden group hover:scale-[1.015] transition-all duration-500 relative bg-destructive/[0.03] border-l-2 border-l-destructive/40">
                        <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 duration-1000">
                            <ArrowUp className="h-20 w-20 text-destructive" />
                        </div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 relative z-10 px-3 sm:px-6">
                            <CardTitle className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-destructive/60">Outflow</CardTitle>
                            <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shadow-inner group-hover:bg-destructive/20 transition-colors">
                                <ArrowUp className="h-4 w-4 text-destructive" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10 pt-2 sm:pt-4 px-3 sm:px-6 pb-6">
                            {isKpiLoading ? <Skeleton className="h-8 w-full" /> : (
                                <div className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-foreground truncate leading-none">
                                    {formatCurrency(totalMonthlyExpenses, currency)}
                                </div>
                            )}
                            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 mt-4 px-1">Daily Burn</p>
                        </CardContent>
                    </Card>
                </div>

      {/* --- TIER 2: ANALYSIS HUB (Trajectory + Health) --- */}
      <div className="grid gap-6 lg:grid-cols-12 items-start mt-4 sm:mt-8">
        {/* Trajectory Analysis */}
        <div className="lg:col-span-8">
            <div className="flex items-center gap-2 mb-4 px-1">
                <TrendingUpIcon className="h-4 w-4 text-primary opacity-60" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Strategy & Velocity</h3>
            </div>
            <Card className="glass-card shadow-premium border-border/40 overflow-hidden bg-background/40 backdrop-blur-2xl">
                <CardHeader className="flex flex-row items-center justify-between px-4 sm:px-6 pt-6 pb-2">
                    <div>
                        <CardTitle className="text-[10.5px] sm:text-[12px] font-black uppercase tracking-widest sm:tracking-[0.2em] text-primary/80 flex items-center gap-2">
                            Trajectory Analysis
                            <div className="h-1 w-1 rounded-full bg-primary animate-ping" />
                        </CardTitle>
                        <CardDescription className="text-[9px] sm:text-xs font-bold uppercase tracking-tight opacity-40">Liquidity Velocity • Predictive</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="px-0 pb-6">
                    <OverviewChart currency={currency} income={personalMonthlyIncome} expenses={personalMonthlyExpenses} isLoading={isChartLoading} dateRefs={dateRefs} />
                </CardContent>
            </Card>
        </div>
        
        {/* Health Score Hub */}
        <div className="lg:col-span-4">
            <div className="hidden lg:flex items-center gap-2 mb-4 px-1">
                <Activity className="h-4 w-4 text-primary opacity-60" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Health Index</h3>
            </div>
            <FinancialHealthCard />
        </div>
      </div>

      {/* --- TIER 3: INTELLIGENCE & ACTIVITY (Insights + Ledger) --- */}
      <div className="grid gap-6 lg:grid-cols-12 items-start mt-12 sm:mt-16">
        {/* Intelligence Side */}
        <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2 px-1">
                <Sparkles className="h-4 w-4 text-emerald-500 opacity-60" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Intelligence Center</h3>
            </div>
            
            {/* Safe to Save Widget (Personal Liquidity) */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-primary rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <SafeToSaveWidget />
            </div>

            {/* Smart Alerts */}
            <SmartAlerts />
        </div>

        {/* Activity Ledger Feed */}
        <div className="lg:col-span-7">
            <div className="flex items-center gap-2 mb-4 px-1">
                <Activity className="h-4 w-4 text-primary opacity-60" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Recent Updates</h3>
            </div>
            <Card className="glass-card shadow-premium border-border/40 overflow-hidden bg-background/40">
                <CardHeader className="flex flex-row items-center justify-between px-5 sm:px-6 pt-6">
                    <div>
                        <CardTitle className="text-[10.5px] sm:text-[12px] font-black uppercase tracking-widest sm:tracking-[0.2em] text-primary/80">Activity Register</CardTitle>
                        <CardDescription className="text-[9px] sm:text-xs font-bold uppercase tracking-tight opacity-40">Latest financial checkpoints</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-6 sm:pb-8">
                    <RecentTransactions transactions={recentTransactions} isLoading={isRecentTxLoading} />
                </CardContent>
            </Card>
        </div>
      </div>

      {/* --- TIER 4: PROJECTIONS (Bottom) --- */}
      <div className="mt-12 sm:mt-16">
          <div className="flex items-center gap-2 mb-6 px-1">
              <Target className="h-4 w-4 text-primary opacity-60" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Strategic Projections</h3>
          </div>
          <StrategicForecastCard />
      </div>

      </div>
    </div>
  );
}
