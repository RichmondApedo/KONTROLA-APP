"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { Label, Pie, PieChart, Sector } from "recharts"
import type { PieSectorDataItem } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase"
import { collection, query, where, Timestamp } from "firebase/firestore"
import type { Expense } from "@/lib/types"
import { Skeleton } from "../ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { subDays } from "date-fns"

const chartConfig = {
  amount: {
    label: "Amount",
  },
  transportation: { label: "Transportation", color: "hsl(var(--chart-1))" },
  groceries: { label: "Groceries", color: "hsl(var(--chart-2))" },
  rent: { label: "Rent", color: "hsl(var(--chart-3))" },
  entertainment: { label: "Entertainment", color: "hsl(var(--chart-4))" },
  other: { label: "Other", color: "hsl(var(--chart-5))" },
};

interface ExpenseChartProps {
    currency: string;
    startDate?: Date;
    endDate?: Date;
}

export function ExpenseChart({ currency, startDate, endDate }: ExpenseChartProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const finalStartDate = startDate || subDays(new Date(), 30);
  const finalEndDate = endDate || new Date();


  const expensesQuery = useMemoFirebase(() =>
    user && firestore
      ? query(
          collection(firestore, 'users', user.uid, 'expenses'),
          where('date', '>=', Timestamp.fromDate(finalStartDate)),
          where('date', '<=', Timestamp.fromDate(finalEndDate))
        )
      : null,
      [user, firestore, finalStartDate, finalEndDate]
  );
  
  const { data: expenses, isLoading } = useCollection<Expense>(expensesQuery);

  const chartData = React.useMemo(() => {
    if (!expenses) return [];

    const categoryTotals = expenses.reduce((acc, expense) => {
      const categoryKey = expense.category.toLowerCase().replace(/\s/g, '') || 'other';
      const categoryLabel = expense.category || 'Other';

      if (!acc[categoryKey]) {
        acc[categoryKey] = {
          name: categoryLabel,
          amount: 0,
          fill: `var(--color-${categoryKey})`
        };
      }
      acc[categoryKey].amount += expense.amount;
      return acc;
    }, {} as Record<string, {name: string, amount: number, fill: string}>);

    return Object.values(categoryTotals);
  }, [expenses]);
  
  const totalExpenses = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.amount, 0)
  }, [chartData]);
  
  const description = React.useMemo(() => {
    const start = formatDate(finalStartDate);
    const end = formatDate(finalEndDate);
    return start === end ? start : `${start} - ${end}`;
  }, [finalStartDate, finalEndDate]);

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  }

  if (isLoading) {
    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="items-center pb-0">
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription><Skeleton className="h-4 w-24" /></CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0 flex items-center justify-center">
                <Skeleton className="h-[250px] w-[250px] rounded-full" />
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-48" />
            </CardFooter>
        </Card>
    );
  }

  if (chartData.length === 0) {
    return (
       <Card className="flex flex-col h-full">
            <CardHeader className="items-center pb-0">
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">No expenses in this period.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle>Expense Breakdown</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel formatter={(value) => formatCurrency(value as number, currency)}/>}
            />
            <Pie
              data={chartData}
              dataKey="amount"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
              activeIndex={0}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius}
                    innerRadius={outerRadius - 8}
                  />
                </g>
              )}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {formatCurrency(totalExpenses, currency, {notation: 'compact'})}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Total
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Your spending summary for the selected period.
        </div>
      </CardFooter>
    </Card>
  )
}
