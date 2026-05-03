'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, orderBy, where, Timestamp, limit } from 'firebase/firestore';
import type { IncomeSource } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { usePeriod } from '@/components/period-provider';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfDay, endOfDay } from 'date-fns';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const AddIncomeDialog = dynamic(() => import('@/components/dashboard/add-income-dialog').then(mod => mod.AddIncomeDialog));
const IncomeChart = dynamic(() => import('@/components/dashboard/income-chart').then(mod => mod.IncomeChart), {
  loading: () => <Skeleton className="h-[450px] w-full" />,
  ssr: false,
});
const IncomeList = dynamic(() => import('@/components/dashboard/income-list').then(mod => mod.IncomeList), {
    loading: () => (
        <div className="space-y-4 md:space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
    ),
    ssr: false,
});

export default function IncomePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile, activeProfile, activeProfileId, isProfileLoading } = useUserProfile();
  const { personal, business } = usePeriod();
  const [context, setContext] = useState<'all' | 'personal' | 'business'>('personal');
  const [pageSize, setPageSize] = useState(20);
  const activeTrack = context === 'business' ? business : personal;
  
  const dateRange = useMemo(() => ({
    from: activeTrack.startDate,
    to: activeTrack.endDate
  }), [activeTrack.startDate, activeTrack.endDate]);
  
  const isAdmin = activeProfile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
  const userPlan = isAdmin ? 'pro-plus' : activeProfile?.plan;

  const targetUid = activeProfileId || user?.uid;
  
  const incomeQuery = useMemo(() => {
    if (!targetUid || !firestore || !dateRange?.from) return null;
    
    // Ensure the date range covers the entire day.
    const from = startOfDay(dateRange.from);
    const to = endOfDay(dateRange.to || dateRange.from);

    return query(
        collection(firestore, 'users', targetUid, 'incomeSources'),
        where('date', '>=', Timestamp.fromDate(from)),
        where('date', '<=', Timestamp.fromDate(to)),
        orderBy('date', 'desc'),
        limit(pageSize)
      );
    },
    [targetUid, firestore, dateRange, pageSize]
  );
  
  const { data: allIncomeSources, isLoading: isIncomeLoading } = useCollection<IncomeSource>(incomeQuery);

  const isDelegate = activeProfileId && user && activeProfileId !== user.uid;
  const filteredIncome = useMemo(() => {
    if (!allIncomeSources) return [];
    if (isDelegate) {
        return context === 'business' || context === 'all' ? allIncomeSources : [];
    }
    if (context === 'all') return allIncomeSources;
    if (context === 'business') return allIncomeSources.filter(i => i.context === 'business');
    return allIncomeSources.filter(i => i.context !== 'business');
  }, [allIncomeSources, context, isDelegate]);

  const isLoading = isProfileLoading || isIncomeLoading;
  const currency = activeProfile?.preferredCurrency || 'ghs';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    {/* --- EXPERT HEADER SECTION --- */}
    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pt-4 pb-8 border-b border-border/10 relative min-h-[160px] xl:min-h-[140px]">
        <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600/60">Revenue Influx Active</span>
            </div>
            <h1 className="text-[clamp(1.75rem,7vw,4.5rem)] font-black font-headline tracking-tighter text-foreground leading-[0.85] sm:leading-[0.9]">
                Income
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-bold uppercase tracking-widest opacity-60">
                Monitor and optimize • <span className="text-primary">{context === 'business' ? 'Business Revenue' : 'Personal Assets'}</span>
            </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center flex-wrap xl:flex-nowrap gap-4 lg:gap-6 min-w-0">
            <div className="shrink-0 w-full md:w-auto">
                <PeriodSelector 
                    periodMode={activeTrack.periodMode}
                    onModeChange={activeTrack.setPeriodMode}
                    incomeDate={profile?.incomeDate}
                    label={activeTrack.label}
                    customRange={activeTrack.customRange}
                    onCustomRangeChange={activeTrack.setCustomRange}
                />
            </div>
            <AddIncomeDialog currency={currency} plan={userPlan} />
        </div>
    </div>

      <Tabs value={context} onValueChange={(v) => setContext(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[450px] glass-card p-1 shadow-soft">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-[10px] uppercase tracking-widest">Unified View</TabsTrigger>
          <TabsTrigger value="personal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-[10px] uppercase tracking-widest">Personal</TabsTrigger>
          <TabsTrigger value="business" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-[10px] uppercase tracking-widest">Business</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="md:col-span-1 glass-card shadow-premium border-border/40 overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Detailed Inflow History</CardTitle>
                <CardDescription className="text-xs uppercase tracking-tight opacity-70">Auditable record of all revenue events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <IncomeList incomeSources={filteredIncome} isLoading={isLoading} />
                {allIncomeSources && allIncomeSources.length >= pageSize && (
                  <div className="flex justify-center pt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPageSize(prev => prev + 20)}
                      className="rounded-xl font-bold uppercase tracking-widest text-[10px] border-primary/20 hover:bg-primary/5"
                    >
                      Load More Transactions
                    </Button>
                  </div>
                )}
            </CardContent>
        </Card>
        <div className="md:col-span-1">
            <IncomeChart currency={currency} incomeSources={filteredIncome} isLoading={isLoading}/>
        </div>
      </div>
    </div>
  );
}
