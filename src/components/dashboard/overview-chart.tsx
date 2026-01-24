'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { formatCurrency } from '@/lib/utils';
import type { IncomeSource, Expense } from '@/lib/types';
import { useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';
import { subMonths, format as formatDate, eachMonthOfInterval, startOfMonth } from 'date-fns';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
  }
};

interface OverviewChartProps {
    currency: string;
    income?: IncomeSource[] | null;
    expenses?: Expense[] | null;
    isLoading?: boolean;
    startDate?: Date;
    endDate?: Date;
}

export function OverviewChart({ currency, income: incomeProp, expenses: expensesProp, isLoading: isLoadingProp, startDate, endDate }: OverviewChartProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const finalStartDate = useMemo(() => startDate || subMonths(new Date(), 5), [startDate]);
  const finalEndDate = useMemo(() => endDate || new Date(), [endDate]);

  const incomeQuery = useMemo(() => {
      if (incomeProp !== undefined || !user || !firestore) return null;
      return query(
          collection(firestore, `users/${user.uid}/incomeSources`),
          where('date', '>=', Timestamp.fromDate(finalStartDate)),
          where('date', '<=', Timestamp.fromDate(finalEndDate))
      );
  }, [user, firestore, incomeProp, finalStartDate, finalEndDate]);

  const expensesQuery = useMemo(() => {
      if (expensesProp !== undefined || !user || !firestore) return null;
      return query(
          collection(firestore, `users/${user.uid}/expenses`),
          where('date', '>=', Timestamp.fromDate(finalStartDate)),
          where('date', '<=', Timestamp.fromDate(finalEndDate))
      );
  }, [user, firestore, expensesProp, finalStartDate, finalEndDate]);

  const { data: fetchedIncome, isLoading: isIncomeLoading } = useCollection<IncomeSource>(incomeQuery);
  const { data: fetchedExpenses, isLoading: isExpensesLoading } = useCollection<Expense>(expensesQuery);

  const income = incomeProp !== undefined ? incomeProp : fetchedIncome;
  const expenses = expensesProp !== undefined ? expensesProp : fetchedExpenses;
  const isLoading = isLoadingProp !== undefined ? isLoadingProp : (isIncomeLoading || isExpensesLoading);


  const chartData = useMemo(() => {
    if (!income && !expenses) return [];

    const monthMap = new Map<string, { month: string, income: number, expenses: number }>();
    
    const processTransactions = (transactions: (IncomeSource | Expense)[], type: 'income' | 'expenses') => {
        if (!transactions) return;
        transactions.forEach(item => {
            const itemDate = (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
            const month = formatDate(itemDate, 'MMM');
            
            if (!monthMap.has(month)) {
                monthMap.set(month, { month, income: 0, expenses: 0 });
            }

            const monthData = monthMap.get(month)!;
            if ('name' in item && type === 'income') {
                monthData.income += item.amount;
            } else if (type === 'expenses') {
                monthData.expenses += item.amount;
            }
        });
    };

    processTransactions(income || [], 'income');
    processTransactions(expenses || [], 'expenses');
    
    const interval = { start: startOfMonth(finalStartDate), end: finalEndDate };
    const monthsInInterval = eachMonthOfInterval(interval);

    const sortedData = monthsInInterval.map(d => {
        const monthName = formatDate(d, 'MMM');
        return monthMap.get(monthName) || { month: monthName, income: 0, expenses: 0 };
    });

    return sortedData;
  }, [income, expenses, finalStartDate, finalEndDate]);

  if (isLoading) {
    return <Skeleton className="h-[350px] w-full" />;
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
            <XAxis
            dataKey="month"
            stroke="hsl(var(--foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            />
            <YAxis
            stroke="hsl(var(--foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(value as number, currency, {notation: 'compact'})}
            />
            <Tooltip
            cursor={false}
            content={<ChartTooltipContent
                formatter={(value) => formatCurrency(value as number, currency)}
                indicator='dot'
            />}
            />
            <Bar dataKey="income" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
        </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}
