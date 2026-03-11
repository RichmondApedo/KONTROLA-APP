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
    income?: IncomeSource[] | null;
    expenses?: Expense[] | null;
    isLoading?: boolean;
}

export function OverviewChart({ currency, income, expenses, isLoading }: OverviewChartProps) {
  // Client-side state to hold the months array, avoiding hydration mismatch
  const [months, setMonths] = useState<Date[]>([]);

  useEffect(() => {
    // This effect runs only on the client, after hydration.
    // It establishes a stable date range for the component's lifetime.
    const end = new Date();
    const start = subMonths(end, 5);
    setMonths(eachMonthOfInterval({ start: startOfMonth(start), end }));
  }, []); // Empty dependency array ensures this runs once.


  const chartData = useMemo(() => {
    // Don't compute chart data until client-side months are set.
    if (months.length === 0) return [];

    const monthMap = new Map<string, { month: string, income: number, expenses: number }>();
    months.forEach(monthDate => {
      const monthName = formatDate(monthDate, 'MMM');
      monthMap.set(monthName, { month: monthName, income: 0, expenses: 0 });
    });
    
    if (income) {
        income.forEach(item => {
            const itemDate = (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
            const monthName = formatDate(itemDate, 'MMM');
            if (monthMap.has(monthName)) {
                monthMap.get(monthName)!.income += item.amount;
            }
        });
    }

    if (expenses) {
        expenses.forEach(item => {
            const itemDate = (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
            const monthName = formatDate(itemDate, 'MMM');
            if (monthMap.has(monthName)) {
                monthMap.get(monthName)!.expenses += item.amount;
            }
        });
    }
    
    return Array.from(monthMap.values());
  }, [income, expenses, months]);

  // Also show skeleton if client-side month calculation is not done.
  if (isLoading || months.length === 0) {
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
