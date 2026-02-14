
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
import type { IncomeSource } from "@/lib/types"
import { Skeleton } from "../ui/skeleton"
import { formatCurrency } from "@/lib/utils"

const chartConfig = {
  amount: {
    label: "Amount",
  },
  salary: { label: "Salary", color: "hsl(var(--chart-1))" },
  freelance: { label: "Freelance", color: "hsl(var(--chart-2))" },
  investment: { label: "Investment", color: "hsl(var(--chart-3))" },
  business: { label: "Business", color: "hsl(var(--chart-4))" },
  other: { label: "Other", color: "hsl(var(--chart-5))" },
};

interface IncomeChartProps {
    currency: string;
    incomeSources?: IncomeSource[] | null;
    isLoading?: boolean;
}

export function IncomeChart({ currency, incomeSources, isLoading }: IncomeChartProps) {
  const chartData = React.useMemo(() => {
    if (!incomeSources) return [];

    const sourceTotals = incomeSources.reduce((acc, income) => {
      const sourceKey = income.name.toLowerCase().replace(/\s/g, '') || 'other';
      const sourceLabel = income.name || 'Other';

      if (!acc[sourceKey]) {
        acc[sourceKey] = {
          name: sourceLabel,
          amount: 0,
          fill: `var(--color-${sourceKey})`
        };
      }
      acc[sourceKey].amount += income.amount;
      return acc;
    }, {} as Record<string, {name: string, amount: number, fill: string}>);

    return Object.values(sourceTotals);
  }, [incomeSources]);
  
  const totalIncome = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.amount, 0)
  }, [chartData]);
  
  const description = "Breakdown by source for all time";

  if (isLoading) {
    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="items-center pb-0">
                <CardTitle>Income Breakdown</CardTitle>
                <CardDescription><Skeleton className="h-4 w-24" /></CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0 flex items-center justify-center">
                <Skeleton className="h-[250px] w-[250px] rounded-full" />
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
                <Skeleton className="h-4 w-40" />
            </CardFooter>
        </Card>
    );
  }

  if (chartData.length === 0) {
    return (
       <Card className="flex flex-col h-full">
            <CardHeader className="items-center pb-0">
                <CardTitle>Income Breakdown</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">No income recorded yet.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle>Income Breakdown</CardTitle>
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
                          {formatCurrency(totalIncome, currency, {notation: 'compact'})}
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
          Your income summary for all recorded transactions.
        </div>
      </CardFooter>
    </Card>
  )
}
