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
  const { profile } = useUserProfile();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [currentTab, setCurrentTab] = useState('all');

  const isAdmin = profile?.role === 'admin';
  const userPlan = isAdmin ? 'pro-plus' : profile?.plan;
  const currency = profile?.preferredCurrency || 'ghs';

  const expensesQuery = useMemo(() => {
    if (!user || !firestore || !dateRange?.from) return null;
    
    // Ensure the date range covers the entire day.
    const from = startOfDay(dateRange.from);
    const to = endOfDay(dateRange.to || dateRange.from);

    return query(
        collection(firestore, 'users', user.uid, 'expenses'),
        where('date', '>=', Timestamp.fromDate(from)),
        where('date', '<=', Timestamp.fromDate(to)),
        orderBy('date', 'desc')
      );
    },
    [user, firestore, dateRange]
  );
  
  const { data: expenses, isLoading } = useCollection<Expense>(expensesQuery);

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
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs uppercase tracking-widest">All Expenses</TabsTrigger>
          <TabsTrigger value="fuel" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs uppercase tracking-widest">Fuel Tracking</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-8">
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="md:col-span-1 glass-card shadow-premium border-border/40 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Expense Ledger</CardTitle>
                <CardDescription className="text-xs uppercase tracking-tight opacity-70">
                  Granular tracking of all operational costs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseList expenses={expenses} isLoading={isLoading} />
              </CardContent>
            </Card>
            <div className="md:col-span-1">
              <ExpenseChart currency={currency} expenses={expenses} isLoading={isLoading}/>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="fuel" className="mt-8">
          <FuelTrackingTab expenses={expenses} isLoading={isLoading} currency={currency} plan={userPlan} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
