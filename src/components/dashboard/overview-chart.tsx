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
    income: IncomeSource[] | null;
    expenses: Expense[] | null;
    isLoading: boolean;
}

export function OverviewChart({ currency, income, expenses, isLoading }: OverviewChartProps) {

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
            // This is a simplified check. In a real app, you'd use a more robust way to differentiate.
            if ('name' in item && type === 'income') {
                monthData.income += item.amount;
            } else if (type === 'expenses') {
                monthData.expenses += item.amount;
            }
        });
    };

    processTransactions(income, 'income');
    processTransactions(expenses, 'expenses');
    
    const end = new Date();
    const start = subMonths(end, 5);
    const interval = { start: startOfMonth(start), end: end };
    const monthsInInterval = eachMonthOfInterval(interval);

    const sortedData = monthsInInterval.map(d => {
        const monthName = formatDate(d, 'MMM');
        return monthMap.get(monthName) || { month: monthName, income: 0, expenses: 0 };
    });

    return sortedData;
  }, [income, expenses]);

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
