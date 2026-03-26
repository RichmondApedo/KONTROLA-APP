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
  efficiency: {
    label: "Efficiency (km/L)",
    color: "hsl(var(--primary) / 0.6)",
  },
};

export function FuelTrackingTab({ expenses, isLoading, currency }: FuelTrackingTabProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");

    const processedFuelData = useMemo(() => {
        if (!expenses) return [];
        
        // Sort chronologically
        const fuel = expenses
            .filter(e => e.category === 'Fuel')
            .sort((a, b) => {
                const dateA = new Date((a.date as any).toDate ? (a.date as any).toDate() : a.date).getTime();
                const dateB = new Date((b.date as any).toDate ? (b.date as any).toDate() : b.date).getTime();
                return dateA - dateB;
            });

        // Calculate efficiency
        return fuel.map((expense, index) => {
            let efficiency: number | null = null;
            let distance: number | null = null;

            if (index > 0) {
                const prevExpense = fuel[index - 1];
                if (expense.odometer && prevExpense.odometer && expense.fuelLiters) {
                    distance = expense.odometer - prevExpense.odometer;
                    if (distance > 0) {
                        efficiency = distance / expense.fuelLiters;
                    }
                }
            }

            return {
                ...expense,
                efficiency,
                distance,
            };
        });
    }, [expenses]);

    const chartData = useMemo(() => {
        return processedFuelData.map(e => {
            const dateObj = new Date((e.date as any).toDate ? (e.date as any).toDate() : e.date);
            return {
                date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(dateObj),
                price: e.fuelPricePerUnit || 0,
                efficiency: e.efficiency ? parseFloat(e.efficiency.toFixed(2)) : null,
                station: e.station || 'Unknown',
            };
        });
    }, [processedFuelData]);

    const efficiencyHistory = [...processedFuelData].reverse();

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-[300px] w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (processedFuelData.length === 0) {
        return (
            <Card className="mt-6 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Fuel className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold">No Fuel Records</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm block mx-auto">
                        Add a new expense with the 'Fuel' category and include your odometer reading to track mileage and trends.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> 
                            Price Trends
                        </CardTitle>
                        <CardDescription className="text-xs">Price comparison over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[200px] w-full">
                            <LineChart data={chartData} margin={{ top: 10, left: 10, right: 10 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                                <YAxis tickLine={false} axisLine={false} fontSize={10} domain={['auto', 'auto']} />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                                <Line dataKey="price" type="monotone" stroke="var(--color-price)" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Fuel className="h-4 w-4" /> 
                            Efficiency Trends (km/L)
                        </CardTitle>
                        <CardDescription className="text-xs">Fuel economy over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[200px] w-full">
                            <LineChart data={chartData.filter(d => d.efficiency !== null)} margin={{ top: 10, left: 10, right: 10 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                                <YAxis tickLine={false} axisLine={false} fontSize={10} domain={['auto', 'auto']} />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                                <Line dataKey="efficiency" type="monotone" stroke="var(--color-efficiency)" strokeWidth={2} dot={false} connectNulls />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Fuel & Mileage History</CardTitle>
                    <CardDescription>Detailed breakdown of your fuel economy</CardDescription>
                </CardHeader>
                <CardContent>
                    {isDesktop ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Station</TableHead>
                                    <TableHead className="text-right">Odometer</TableHead>
                                    <TableHead className="text-right">Liters/Qty</TableHead>
                                    <TableHead className="text-right">Efficiency</TableHead>
                                    <TableHead className="text-right">Total Cost</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {efficiencyHistory.map(expense => (
                                    <TableRow key={expense.id}>
                                        <TableCell>
                                            {new Date((expense.date as any).toDate ? (expense.date as any).toDate() : expense.date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="font-medium">{expense.station || '-'}</TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {expense.odometer ? `${expense.odometer.toLocaleString()} km` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {expense.fuelLiters ? expense.fuelLiters.toFixed(2) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {expense.efficiency ? (
                                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                                                    {expense.efficiency.toFixed(2)} km/L
                                                </span>
                                            ) : '-'}
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
                            {efficiencyHistory.map(expense => (
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
                                            <div className="text-right">
                                                <p className="font-bold text-lg">
                                                    {formatCurrency(expense.amount, currency)}
                                                </p>
                                                {expense.efficiency && (
                                                    <p className="text-xs font-bold text-primary">
                                                        {expense.efficiency.toFixed(2)} km/L
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Qty</p>
                                                <p className="text-sm font-medium">{expense.fuelLiters ? `${expense.fuelLiters.toFixed(2)} L` : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Odometer</p>
                                                <p className="text-sm font-medium whitespace-nowrap">{expense.odometer ? `${expense.odometer.toLocaleString()}` : '-'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unit Price</p>
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
