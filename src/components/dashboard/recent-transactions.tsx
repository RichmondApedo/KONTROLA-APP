'use client';
import { formatCurrency, cn } from '@/lib/utils';
import type { IncomeSource, Expense, CombinedTransaction } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import React from 'react';


interface RecentTransactionsProps {
  transactions: CombinedTransaction[];
  isLoading: boolean;
}

const getEmojiForTransaction = (transaction: CombinedTransaction): string => {
    const description = transaction.description.toLowerCase();
    const category = transaction.category.toLowerCase();

    if (category.includes('food') || description.includes('food') || description.includes('lunch') || description.includes('restaurant') || category.includes('groceries')) return '🍔';
    if (category.includes('transport') || description.includes('uber') || description.includes('bolt') || description.includes('fuel') || description.includes('bus')) return '🚗';
    if (category.includes('shopping') || description.includes('shopping') || description.includes('clothing')) return '🛍️';
    if (category.includes('rent') || description.includes('rent')) return '🏠';
    if (category.includes('salary') || description.includes('salary')) return '💼';
    if (category.includes('payment') || description.includes('payment')) return '💳';
    if (category.includes('bill') || description.includes('bill') || description.includes('subscription') || description.includes('netflix') || description.includes('spotify')) return '🧾';
    if (category.includes('health') || description.includes('health') || description.includes('pharmacy') || description.includes('doctor')) return '⚕️';
    if (category.includes('entertainment') || description.includes('entertainment') || description.includes('movie') || description.includes('concert')) return '🎟️';
    if (category.includes('church') || description.includes('church') || description.includes('offering') || description.includes('tithe')) return '⛪';
    if (category.includes('investment') || description.includes('investment')) return '📈';
    if (category.includes('business') || description.includes('business') || description.includes('office')) return '🏢';


    // Default based on transaction type if no keywords match
    return transaction.type === 'income' ? '💰' : '💸';
};


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
              {getEmojiForTransaction(transaction)}
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
