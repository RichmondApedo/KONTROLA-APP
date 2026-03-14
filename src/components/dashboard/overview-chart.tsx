'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { formatCurrency } from '@/lib/utils';
import type { IncomeSource, Expense } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';
import { format as formatDate, eachDayOfInterval } from 'date-fns';

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
    dateRefs: { startOfMonth: Date; endOfMonth: Date; } | null;
}

export function OverviewChart({ currency, income, expenses, isLoading, dateRefs }: OverviewChartProps) {
  // Client-side state to hold the days array, avoiding hydration mismatch
  const [days, setDays] = useState<Date[]>([]);

  useEffect(() => {
    // This effect runs only on the client, after hydration.
    if (dateRefs) {
      setDays(eachDayOfInterval({ start: dateRefs.startOfMonth, end: dateRefs.endOfMonth }));
    }
  }, [dateRefs]);


  const chartData = useMemo(() => {
    // Don't compute chart data until client-side days are set.
    if (days.length === 0) return [];

    const dayMap = new Map<string, { day: string, income: number, expenses: number }>();
    days.forEach(dayDate => {
      const dayName = formatDate(dayDate, 'd');
      dayMap.set(dayName, { day: dayName, income: 0, expenses: 0 });
    });
    
    if (income) {
        income.forEach(item => {
            const itemDate = (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
            const dayName = formatDate(itemDate, 'd');
            if (dayMap.has(dayName)) {
                dayMap.get(dayName)!.income += item.amount;
            }
        });
    }

    if (expenses) {
        expenses.forEach(item => {
            const itemDate = (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
            const dayName = formatDate(itemDate, 'd');
            if (dayMap.has(dayName)) {
                dayMap.get(dayName)!.expenses += item.amount;
            }
        });
    }
    
    return Array.from(dayMap.values());
  }, [income, expenses, days]);

  // Also show skeleton if client-side day calculation is not done.
  if (isLoading || days.length === 0) {
    return <Skeleton className="h-[350px] w-full" />;
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
            <XAxis
            dataKey="day"
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
