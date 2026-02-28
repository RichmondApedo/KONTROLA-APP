'use client';
import { formatCurrency, cn } from '@/lib/utils';
import type { IncomeSource, Expense } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import React from 'react';

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
    <div className="space-y-6">
      {transactions.map(transaction => (
        <div key={transaction.id} className="flex items-center">
           <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-xl">
              {transaction.type === 'income' ? '💰' : '💸'}
            </div>
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
                ? 'text-primary'
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
