'use client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, cn } from '@/lib/utils';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { IncomeSource, Expense } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import React from 'react';

const categoryIcons: Record<string, string> = {
  Salary: '💼',
  Groceries: '🛒',
  Rent: '🏠',
  'Dining Out': '🍔',
  Freelance: '💻',
  Transportation: '🚗',
  Shopping: '🛍️',
  Entertainment: '🎬',
  Food: '🍔',
};

type CombinedTransaction = (IncomeSource & { type: 'income' }) | (Expense & { type: 'expense' });

export function RecentTransactions() {
  const { user } = useUser();
  const firestore = useFirestore();

  const incomeQuery = useMemoFirebase(() =>
    user && firestore
      ? query(
          collection(firestore, `users/${user.uid}/incomeSources`),
          orderBy('date', 'desc'),
          limit(5)
        )
      : null,
    [user, firestore]
  );
  
  const expensesQuery = useMemoFirebase(() =>
    user && firestore
      ? query(
          collection(firestore, `users/${user.uid}/expenses`),
          orderBy('date', 'desc'),
          limit(5)
        )
      : null,
      [user, firestore]
  );

  const { data: income, isLoading: incomeLoading } =
    useCollection<IncomeSource>(incomeQuery);
  const { data: expenses, isLoading: expensesLoading } =
    useCollection<Expense>(expensesQuery);

  const combined = React.useMemo(() => {
    const incomeTransactions: CombinedTransaction[] = income ? income.map(i => ({...i, type: 'income', description: i.name})) : [];
    const expenseTransactions: CombinedTransaction[] = expenses ? expenses.map(e => ({...e, type: 'expense'})) : [];

    return [...incomeTransactions, ...expenseTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [income, expenses]);

  if (incomeLoading || expensesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (combined.length === 0) {
      return <div className="text-center text-muted-foreground py-8">No recent transactions.</div>
  }

  return (
    <div className="space-y-8">
      {combined.map(transaction => (
        <div key={transaction.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback>
              {categoryIcons[transaction.category] || '💸'}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">
              {transaction.description}
            </p>
            <p className="text-sm text-muted-foreground">
              {transaction.category}
            </p>
          </div>
          <div
            className={cn(
              'ml-auto font-medium',
              transaction.type === 'income'
                ? 'text-accent-foreground'
                : 'text-destructive'
            )}
          >
            {transaction.type === 'income' ? '+' : '-'}
            {formatCurrency(transaction.amount, transaction.currency)}
          </div>
        </div>
      ))}
    </div>
  );
}
