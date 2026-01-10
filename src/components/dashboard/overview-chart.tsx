'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { formatCurrency } from '@/lib/utils';


const chartData = [
  { month: 'January', income: 1860, expenses: 800 },
  { month: 'February', income: 3050, expenses: 2000 },
  { month: 'March', income: 2370, expenses: 1200 },
  { month: 'April', income: 2780, expenses: 2900 },
  { month: 'May', income: 1890, expenses: 900 },
  { month: 'June', income: 2390, expenses: 1800 },
];

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
  }
}

export function OverviewChart() {
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
            tickFormatter={(value) => formatCurrency(value as number).slice(0, -3)}
            />
            <Tooltip
            cursor={false}
            content={<ChartTooltipContent
                formatter={(value) => formatCurrency(value as number)}
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
