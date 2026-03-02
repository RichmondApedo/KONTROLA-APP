'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, doc, where, Timestamp } from 'firebase/firestore';
import type { IncomeSource, UserProfile } from '@/lib/types';
import { AddIncomeDialog } from '@/components/dashboard/add-income-dialog';
import { useMemo, useState, useEffect } from 'react';
import { IncomeChart } from '@/components/dashboard/income-chart';
import { IncomeList } from '@/components/dashboard/income-list';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfDay, endOfDay } from 'date-fns';

export default function IncomePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    setDateRange({ from: addDays(new Date(), -30), to: new Date() });
  }, []);

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);
  
  const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
  const userPlan = isAdmin ? 'pro-plus' : profile?.plan;
  
  const incomeQuery = useMemo(() => {
    if (!user || !firestore || !dateRange?.from) return null;
    
    // Ensure the date range covers the entire day.
    const from = startOfDay(dateRange.from);
    const to = endOfDay(dateRange.to || dateRange.from);

    return query(
        collection(firestore, 'users', user.uid, 'incomeSources'),
        where('date', '>=', Timestamp.fromDate(from)),
        where('date', '<=', Timestamp.fromDate(to)),
        orderBy('date', 'desc')
      );
    },
    [user, firestore, dateRange]
  );
  
  const { data: incomeSources, isLoading: isIncomeLoading } = useCollection<IncomeSource>(incomeQuery);

  const isLoading = isProfileLoading || isIncomeLoading;
  const currency = profile?.preferredCurrency || 'USD';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Income
          </h1>
          <p className="text-muted-foreground">
            Track and visualize your income sources.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <DateRangePicker 
                date={dateRange}
                onDateChange={setDateRange}
                className="w-full sm:w-auto" />
            <AddIncomeDialog currency={currency} plan={userPlan} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-3">
            <CardHeader>
                <CardTitle>Income History</CardTitle>
                <CardDescription>A list of your income for the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
                <IncomeList incomeSources={incomeSources} isLoading={isLoading} />
            </CardContent>
        </Card>
        <div className="md:col-span-2">
            <IncomeChart currency={currency} incomeSources={incomeSources} isLoading={isLoading}/>
        </div>
      </div>
    </div>
  );
}
