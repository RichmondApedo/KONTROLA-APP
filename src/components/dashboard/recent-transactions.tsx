'use client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, cn } from '@/lib/utils';
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

interface RecentTransactionsProps {
  transactions: CombinedTransaction[];
  isLoading: boolean;
}


export function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  
  if (isLoading) {
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

  if (transactions.length === 0) {
      return <div className="text-center text-muted-foreground py-8">No recent transactions.</div>
  }

  return (
    <div className="space-y-8">
      {transactions.map(transaction => (
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
