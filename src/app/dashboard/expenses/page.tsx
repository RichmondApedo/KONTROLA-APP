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
import { collection, orderBy, query, doc, limit } from 'firebase/firestore';
import type { Expense, UserProfile } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExpenseList } from '@/components/dashboard/expense-list';

export default function ExpensesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [docLimit, setDocLimit] = useState(20);

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile } = useDoc<UserProfile>(profileDocRef);

  const expensesQuery = useMemo(() =>
    user && firestore
      ? query(
          collection(firestore, 'users', user.uid, 'expenses'),
          orderBy('date', 'desc'),
          limit(docLimit)
        )
      : null,
      [user, firestore, docLimit]
  );
  
  const { data: expenses, isLoading } = useCollection<Expense>(expensesQuery);

  const hasMore = expenses && expenses.length === docLimit;

  return (
    <div className="grid gap-6 md:grid-cols-5">
      <div className="md:col-span-3 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">
              Expenses
            </h1>
            <p className="text-muted-foreground">
              Track and manage your daily spending.
            </p>
          </div>
          <AddExpenseDialog currency={profile?.preferredCurrency || 'USD'} plan={profile?.plan} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expense History</CardTitle>
            <CardDescription>
              A list of your most recent expenses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseList expenses={expenses} isLoading={isLoading} />
            {hasMore && (
              <div className="mt-6 text-center">
                  <Button onClick={() => setDocLimit(prev => prev + 20)} variant="outline">
                      Load More
                  </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="md:col-span-2">
        <ExpenseChart currency={profile?.preferredCurrency || 'USD'} expenses={expenses} isLoading={isLoading}/>
      </div>
    </div>
  );
}
