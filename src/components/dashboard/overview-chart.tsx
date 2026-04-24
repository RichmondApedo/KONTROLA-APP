'use client';

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { formatCurrency } from '@/lib/utils';
import type { IncomeSource, Expense } from '@/lib/types';
import { useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';
import { format as formatDate, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';

const chartConfig = {
  income: {
    label: "Inflow",
    color: "hsl(var(--primary))",
  },
  expenses: {
    label: "Outflow",
    color: "hsl(var(--destructive))",
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
                    monthMap.get(monthName)![type] += (item.amount || 0);
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
                dayMap.get(dayName)!.income += (item.amount || 0);
            }
        });
    }

    if (expenses) {
        expenses.forEach(item => {
            const itemDate = (item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date);
            const dayName = formatDate(itemDate, 'd');
            if (dayMap.has(dayName)) {
                dayMap.get(dayName)!.expenses += (item.amount || 0);
            }
        });
    }
    
    return Array.from(dayMap.values());
  }, [income, expenses, dateRefs]);

  if (isLoading) {
    return <Skeleton className="h-[280px] w-full" />;
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
        <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
            <defs>
                <linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.08} />
            <XAxis
            dataKey="day"
            stroke="hsl(var(--muted-foreground))"
            fontSize={8}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={30}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 800, letterSpacing: '0.05em' }}
            />
            <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={8}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(value as number, currency, {notation: 'compact'})}
            width={40}
            className="hidden xs:block"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 800 }}
            />
            <Tooltip
            cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
            content={<ChartTooltipContent
                className="glass-card border-primary/20 shadow-premium backdrop-blur-xl"
                formatter={(value, name) => (
                    <div className="flex items-center gap-2">
                         <div className={cn("h-1.5 w-1.5 rounded-full", name === 'income' ? "bg-primary" : "bg-destructive")} />
                         <span className="font-black">{formatCurrency(value as number, currency)}</span>
                    </div>
                )}
                indicator="dot"
            />}
            />
            <Area 
                type="monotone" 
                dataKey="income" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#incomeArea)" 
                activeDot={{ r: 5, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
            />
            <Area 
                type="monotone" 
                dataKey="expenses" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#expenseArea)" 
                activeDot={{ r: 5, strokeWidth: 0, fill: 'hsl(var(--destructive))' }}
            />
        </AreaChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}
