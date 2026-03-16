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


export default function ExpensesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile } = useUserProfile();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Expenses
          </h1>
          <p className="text-muted-foreground">
            Track and manage your daily spending.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <DateRangePicker 
              date={dateRange}
              onDateChange={setDateRange}
              className="w-full sm:w-auto" />
          <AddExpenseDialog currency={currency} plan={userPlan} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Expense History</CardTitle>
            <CardDescription>
              A list of your expenses for the selected period.
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
    </div>
  );
}
