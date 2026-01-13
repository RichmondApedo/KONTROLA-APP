'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { formatCurrency } from '@/lib/utils';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import type { IncomeSource, Expense } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';
import { subMonths, format as formatDate, eachMonthOfInterval, startOfMonth } from 'date-fns';

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
    startDate?: Date;
    endDate?: Date;
}

export function OverviewChart({ currency, startDate, endDate }: OverviewChartProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const finalStartDate = startDate || subMonths(new Date(), 5);
  const finalEndDate = endDate || new Date();

  const incomeQuery = useMemoFirebase(() =>
    user && firestore
      ? query(
          collection(firestore, `users/${user.uid}/incomeSources`),
          where('date', '>=', Timestamp.fromDate(finalStartDate)),
          where('date', '<=', Timestamp.fromDate(finalEndDate)),
          orderBy('date', 'asc')
        )
      : null,
    [user, firestore, finalStartDate, finalEndDate]
  );
  
  const expensesQuery = useMemoFirebase(() =>
    user && firestore
      ? query(
          collection(firestore, `users/${user.uid}/expenses`),
          where('date', '>=', Timestamp.fromDate(finalStartDate)),
          where('date', '<=', Timestamp.fromDate(finalEndDate)),
          orderBy('date', 'asc')
        )
      : null,
      [user, firestore, finalStartDate, finalEndDate]
  );

  const { data: income, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

  const chartData = useMemo(() => {
    const interval = { start: startOfMonth(finalStartDate), end: finalEndDate };
    const monthsInInterval = eachMonthOfInterval(interval);

    const months = monthsInInterval.map(d => ({
        month: formatDate(d, 'MMM'),
        income: 0,
        expenses: 0,
      }));

    const monthMap = new Map(months.map(m => [m.month, m]));

    income?.forEach(item => {
      // FIX: Handle Firestore Timestamp object correctly
      const itemDate = (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
      const month = formatDate(itemDate, 'MMM');
      if (monthMap.has(month)) {
        monthMap.get(month)!.income += item.amount;
      }
    });

    expenses?.forEach(item => {
      // FIX: Handle Firestore Timestamp object correctly
      const itemDate = (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
      const month = formatDate(itemDate, 'MMM');
      if (monthMap.has(month)) {
        monthMap.get(month)!.expenses += item.amount;
      }
    });

    return Array.from(monthMap.values());
  }, [income, expenses, finalStartDate, finalEndDate]);

  if (incomeLoading || expensesLoading) {
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
