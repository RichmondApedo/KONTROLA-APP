'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, orderBy, query, where, Timestamp } from 'firebase/firestore';
import type { Expense } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfDay, endOfDay } from 'date-fns';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const AddExpenseDialog = dynamic(() => import('@/components/dashboard/add-expense-dialog').then(mod => mod.AddExpenseDialog));
const ExpenseChart = dynamic(() => import('@/components/dashboard/expense-chart').then(mod => mod.ExpenseChart), {
  loading: () => <Skeleton className="h-[450px] w-full" />,
  ssr: false,
});
const ExpenseList = dynamic(() => import('@/components/dashboard/expense-list').then(mod => mod.ExpenseList), {
    loading: () => (
        <div className="space-y-4 md:space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
    ),
    ssr: false,
});
const FuelTrackingTab = dynamic(() => import('@/components/dashboard/fuel-tracking-tab').then(mod => mod.FuelTrackingTab), {
    loading: () => <Skeleton className="h-[300px] w-full" />,
    ssr: false,
});


export default function ExpensesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile, activeProfile, activeProfileId } = useUserProfile();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [currentTab, setCurrentTab] = useState('all');

  const isAdmin = activeProfile?.role === 'admin';
  const userPlan = isAdmin ? 'pro-plus' : activeProfile?.plan;
  const currency = activeProfile?.preferredCurrency || 'ghs';

  const targetUid = activeProfileId || user?.uid;
  const [contextFilter, setContextFilter] = useState<'all' | 'personal' | 'business'>('all');
  
  const expensesQuery = useMemo(() => {
    if (!targetUid || !firestore || !dateRange?.from) return null;
    
    // Ensure the date range covers the entire day.
    const from = startOfDay(dateRange.from);
    const to = endOfDay(dateRange.to || dateRange.from);

    return query(
        collection(firestore, 'users', targetUid, 'expenses'),
        where('date', '>=', Timestamp.fromDate(from)),
        where('date', '<=', Timestamp.fromDate(to)),
        orderBy('date', 'desc')
      );
    },
    [targetUid, firestore, dateRange]
  );
  
  const { data: allExpenses, isLoading } = useCollection<Expense>(expensesQuery);

  const filteredExpenses = useMemo(() => {
    if (!allExpenses) return [];
    if (contextFilter === 'all') return allExpenses;
    if (contextFilter === 'business') return allExpenses.filter(e => e.context === 'business');
    return allExpenses.filter(e => e.context !== 'business');
  }, [allExpenses, contextFilter]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground sm:text-5xl">
            Expenses
          </h1>
          <p className="text-muted-foreground mt-1 text-lg font-medium">
            Analyze and optimize your capital outflow.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <DateRangePicker 
              date={dateRange}
              onDateChange={setDateRange}
              className="w-full sm:w-auto glass-card shadow-sm" />
          <AddExpenseDialog currency={currency} plan={userPlan} defaultCategory={currentTab === 'fuel' ? 'Fuel' : ''} />
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] glass-card p-1 shadow-soft">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs uppercase tracking-widest">Expense Ledger</TabsTrigger>
          <TabsTrigger value="fuel" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs uppercase tracking-widest">Fuel Tracking</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-4">
        <Tabs value={contextFilter} onValueChange={(v) => setContextFilter(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:w-[450px] glass-card p-1 shadow-soft">
                <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-[10px] uppercase tracking-widest">Unified View</TabsTrigger>
                <TabsTrigger value="personal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-[10px] uppercase tracking-widest">Personal</TabsTrigger>
                <TabsTrigger value="business" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-[10px] uppercase tracking-widest">Business</TabsTrigger>
            </TabsList>
        </Tabs>
      </div>

      <div className="mt-8">
        {currentTab === 'all' ? (
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="md:col-span-1 glass-card shadow-premium border-border/40 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Expense Ledger</CardTitle>
                <CardDescription className="text-xs uppercase tracking-tight opacity-70">
                  Granular tracking of all operational costs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseList expenses={filteredExpenses} isLoading={isLoading} />
              </CardContent>
            </Card>
            <div className="md:col-span-1">
              <ExpenseChart currency={currency} expenses={filteredExpenses} isLoading={isLoading}/>
            </div>
          </div>
        ) : (
          <FuelTrackingTab expenses={filteredExpenses} isLoading={isLoading} currency={currency} plan={userPlan} />
        )}
      </div>
    </div>
  );
}
