'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, orderBy, where, Timestamp } from 'firebase/firestore';
import type { IncomeSource } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
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
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  
  const isAdmin = activeProfile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
  const userPlan = isAdmin ? 'pro-plus' : activeProfile?.plan;

  const targetUid = activeProfileId || user?.uid;
  const [context, setContext] = useState<'all' | 'personal' | 'business'>('all');
  
  const incomeQuery = useMemo(() => {
    if (!targetUid || !firestore || !dateRange?.from) return null;
    
    // Ensure the date range covers the entire day.
    const from = startOfDay(dateRange.from);
    const to = endOfDay(dateRange.to || dateRange.from);

    return query(
        collection(firestore, 'users', targetUid, 'incomeSources'),
        where('date', '>=', Timestamp.fromDate(from)),
        where('date', '<=', Timestamp.fromDate(to)),
        orderBy('date', 'desc')
      );
    },
    [targetUid, firestore, dateRange]
  );
  
  const { data: allIncomeSources, isLoading: isIncomeLoading } = useCollection<IncomeSource>(incomeQuery);

  const filteredIncome = useMemo(() => {
    if (!allIncomeSources) return [];
    if (context === 'all') return allIncomeSources;
    if (context === 'business') return allIncomeSources.filter(i => i.context === 'business');
    return allIncomeSources.filter(i => i.context !== 'business');
  }, [allIncomeSources, context]);

  const isLoading = isProfileLoading || isIncomeLoading;
  const currency = activeProfile?.preferredCurrency || 'ghs';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground sm:text-5xl">
            Income
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Monitor and optimize your revenue streams.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <DateRangePicker 
                date={dateRange}
                onDateChange={setDateRange}
                className="w-full sm:w-auto glass-card shadow-sm" />
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
            <CardContent>
                <IncomeList incomeSources={filteredIncome} isLoading={isLoading} />
            </CardContent>
        </Card>
        <div className="md:col-span-1">
            <IncomeChart currency={currency} incomeSources={filteredIncome} isLoading={isLoading}/>
        </div>
      </div>
    </div>
  );
}
