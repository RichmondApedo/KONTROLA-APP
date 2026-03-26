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
import { format as formatDate, eachDayOfInterval, isSameDay } from 'date-fns';

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
    dateRefs?: { startOfMonth: Date; endOfMonth: Date; };
}

export function OverviewChart({ currency, income, expenses, isLoading, dateRefs }: OverviewChartProps) {

  const chartData = useMemo(() => {
    if (!dateRefs) return [];

    const days = eachDayOfInterval({ start: dateRefs.startOfMonth, end: dateRefs.endOfMonth });
    
    // If the range is large, group by month instead of day
    const isLargeRange = days.length > 62;

    if (isLargeRange) {
        const monthMap = new Map<string, { day: string; income: number; expenses: number }>();
        
        const addToMap = (data: IncomeSource[] | Expense[], type: 'income' | 'expenses') => {
            if (data) {
                data.forEach(item => {
                    const itemDate = (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
                    const monthName = formatDate(itemDate, 'MMM');
                    if (!monthMap.has(monthName)) {
                        monthMap.set(monthName, { day: monthName, income: 0, expenses: 0 });
                    }
                    monthMap.get(monthName)![type] += item.amount;
                });
            }
        };

        addToMap(income || [], 'income');
        addToMap(expenses || [], 'expenses');
        
        // Ensure all months in the interval are present
        let currentDate = new Date(dateRefs.startOfMonth);
        while (currentDate <= dateRefs.endOfMonth) {
            const monthName = formatDate(currentDate, 'MMM');
            if (!monthMap.has(monthName)) {
                 monthMap.set(monthName, { day: monthName, income: 0, expenses: 0 });
            }
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        // Sort the map by date
        const sortedMap = new Map([...monthMap.entries()].sort((a, b) => {
            const dateA = new Date(`01 ${a[0]} 2000`);
            const dateB = new Date(`01 ${b[0]} 2000`);
            return dateA.getTime() - dateB.getTime();
        }));

        return Array.from(sortedMap.values());
    }


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
  }, [income, expenses, dateRefs]);

  if (isLoading) {
    return <Skeleton className="h-[350px] w-full" />;
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
            <XAxis
            dataKey="day"
            stroke="hsl(var(--foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={30}
            />
            <YAxis
            stroke="hsl(var(--foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(value as number, currency, {notation: 'compact'})}
            width={40}
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
