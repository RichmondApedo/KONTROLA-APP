'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ExpenseChart } from '@/components/dashboard/expense-chart';
import { AddExpenseDialog } from '@/components/dashboard/add-expense-dialog';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, orderBy, query, doc, where, Timestamp } from 'firebase/firestore';
import type { Expense, UserProfile } from '@/lib/types';
import { useMemo, useState } from 'react';
import { ExpenseList } from '@/components/dashboard/expense-list';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';

export default function ExpensesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile } = useDoc<UserProfile>(profileDocRef);

  const expensesQuery = useMemo(() => {
    if (!user || !firestore || !dateRange?.from) return null;
    return query(
        collection(firestore, 'users', user.uid, 'expenses'),
        where('date', '>=', Timestamp.fromDate(dateRange.from)),
        where('date', '<=', Timestamp.fromDate(dateRange.to || new Date())),
        orderBy('date', 'desc')
      );
    },
    [user, firestore, dateRange]
  );
  
  const { data: expenses, isLoading } = useCollection<Expense>(expensesQuery);

  return (
    <div className="grid gap-6 md:grid-cols-5">
      <div className="md:col-span-3 space-y-6">
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
            <AddExpenseDialog currency={profile?.preferredCurrency || 'USD'} plan={profile?.plan} />
          </div>
        </div>

        <Card>
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
      </div>
      <div className="md:col-span-2">
        <ExpenseChart currency={profile?.preferredCurrency || 'USD'} expenses={expenses} isLoading={isLoading}/>
      </div>
    </div>
  );
}
