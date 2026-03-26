'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Fuel, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

interface FuelTrackingTabProps {
    expenses: Expense[] | null;
    isLoading: boolean;
    currency: string;
}

const chartConfig = {
  price: {
    label: "Price per Unit",
    color: "hsl(var(--primary))",
  },
};

export function FuelTrackingTab({ expenses, isLoading, currency }: FuelTrackingTabProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");

    const fuelExpenses = useMemo(() => {
        if (!expenses) return [];
        return expenses.filter(e => e.category === 'Fuel').sort((a, b) => {
            const dateA = new Date((a.date as any).toDate ? (a.date as any).toDate() : a.date).getTime();
            const dateB = new Date((b.date as any).toDate ? (b.date as any).toDate() : b.date).getTime();
            return dateA - dateB; // chronological for chart
        });
    }, [expenses]);

    const chartData = useMemo(() => {
        return fuelExpenses.map(e => {
            const dateObj = new Date((e.date as any).toDate ? (e.date as any).toDate() : e.date);
            return {
                date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(dateObj),
                price: e.fuelPricePerUnit || 0,
                station: e.station || 'Unknown',
            };
        });
    }, [fuelExpenses]);

    const reversedFuelExpenses = [...fuelExpenses].reverse(); // newest first for table

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-[300px] w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (fuelExpenses.length === 0) {
        return (
            <Card className="mt-6 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Fuel className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold">No Fuel Records</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm block mx-auto">
                        Add a new expense with the 'Fuel' category to track your fuel consumption and compare prices over time.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 mt-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" /> 
                        Average Price Trends
                    </CardTitle>
                    <CardDescription>Price comparison over your history</CardDescription>
                </CardHeader>
                <CardContent>
                     <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <LineChart data={chartData} margin={{ top: 20, left: 12, right: 12 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                            />
                            <YAxis 
                                dataKey="price"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                                domain={['auto', 'auto']}
                            />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" labelKey="station" />} />
                            <Line
                                dataKey="price"
                                type="natural"
                                stroke="var(--color-price)"
                                strokeWidth={2}
                                dot={{ fill: "var(--color-price)" }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Fuel History</CardTitle>
                    <CardDescription>Detailed breakdown of your fuel purchases</CardDescription>
                </CardHeader>
                <CardContent>
                    {isDesktop ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Station</TableHead>
                                    <TableHead className="text-right">Liters/Qty</TableHead>
                                    <TableHead className="text-right">Price per Unit</TableHead>
                                    <TableHead className="text-right">Total Cost</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reversedFuelExpenses.map(expense => (
                                    <TableRow key={expense.id}>
                                        <TableCell>
                                            {new Date((expense.date as any).toDate ? (expense.date as any).toDate() : expense.date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="font-medium">{expense.station || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            {expense.fuelLiters ? expense.fuelLiters.toFixed(2) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {expense.fuelPricePerUnit ? formatCurrency(expense.fuelPricePerUnit, currency) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(expense.amount, currency)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="space-y-4">
                            {reversedFuelExpenses.map(expense => (
                                <Card key={expense.id} className="bg-muted/30 border-none shadow-none">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-primary">
                                                    {expense.station || 'Unknown Station'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date((expense.date as any).toDate ? (expense.date as any).toDate() : expense.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                                </p>
                                            </div>
                                            <p className="font-bold text-lg">
                                                {formatCurrency(expense.amount, currency)}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Quantity</p>
                                                <p className="text-sm font-medium">{expense.fuelLiters ? `${expense.fuelLiters.toFixed(2)} L` : '-'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Price / Liter</p>
                                                <p className="text-sm font-medium">{expense.fuelPricePerUnit ? formatCurrency(expense.fuelPricePerUnit, currency) : '-'}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
