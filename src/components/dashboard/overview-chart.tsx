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
import { useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';

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
}

export function OverviewChart({ currency }: OverviewChartProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const now = useMemo(() => new Date(), []);
  const last6Months = useMemo(() => new Date(now.getFullYear(), now.getMonth() - 5, 1), [now]);

  const incomeQuery = useMemoFirebase(() =>
    user && firestore
      ? query(
          collection(firestore, `users/${user.uid}/incomeSources`),
          where('date', '>=', Timestamp.fromDate(last6Months)),
          orderBy('date', 'asc')
        )
      : null,
    [user, firestore, last6Months]
  );
  
  const expensesQuery = useMemoFirebase(() =>
    user && firestore
      ? query(
          collection(firestore, `users/${user.uid}/expenses`),
          where('date', '>=', Timestamp.fromDate(last6Months)),
          orderBy('date', 'asc')
        )
      : null,
      [user, firestore, last6Months]
  );

  const { data: income, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        month: d.toLocaleString('default', { month: 'short' }),
        income: 0,
        expenses: 0,
      };
    }).reverse();

    const monthMap = new Map(months.map(m => [m.month, m]));

    income?.forEach(item => {
      const itemDate = new Date(item.date);
      const month = itemDate.toLocaleString('default', { month: 'short' });
      if (monthMap.has(month)) {
        monthMap.get(month)!.income += item.amount;
      }
    });

    expenses?.forEach(item => {
      const itemDate = new Date(item.date);
      const month = itemDate.toLocaleString('default', { month: 'short' });
      if (monthMap.has(month)) {
        monthMap.get(month)!.expenses += item.amount;
      }
    });

    return Array.from(monthMap.values());
  }, [income, expenses, now]);

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
