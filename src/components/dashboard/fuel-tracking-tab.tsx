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
import { Fuel, TrendingUp, Gauge, Zap, DollarSign, ArrowUpRight, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
    label: "Price per Liter",
    color: "hsl(var(--primary))",
  },
  efficiency: {
    label: "Efficiency (km/L)",
    color: "hsl(var(--emerald-500))",
  },
};

export function FuelTrackingTab({ expenses, isLoading, currency }: FuelTrackingTabProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");

    const { processedFuelData, stats } = useMemo(() => {
        if (!expenses) return { processedFuelData: [], stats: null };
        
        // Sort chronologically
        const fuel = expenses
            .filter(e => e.category === 'Fuel')
            .sort((a, b) => {
                const dateA = new Date((a.date as any).toDate ? (a.date as any).toDate() : a.date).getTime();
                const dateB = new Date((b.date as any).toDate ? (b.date as any).toDate() : b.date).getTime();
                return dateA - dateB;
            });

        let totalDistance = 0;
        let totalLitersForEfficiency = 0;
        let totalSpend = 0;
        let totalLiters = 0;

        const processed = fuel.map((expense, index) => {
            let efficiency: number | null = null;
            let distance: number | null = null;
            let costPerKm: number | null = null;

            totalSpend += expense.amount;
            totalLiters += expense.fuelLiters || 0;

            if (index > 0) {
                const prevExpense = fuel[index - 1];
                if (expense.odometer && prevExpense.odometer && expense.fuelLiters) {
                    distance = expense.odometer - prevExpense.odometer;
                    if (distance > 0) {
                        efficiency = distance / expense.fuelLiters;
                        costPerKm = expense.amount / distance;
                        
                        totalDistance += distance;
                        totalLitersForEfficiency += expense.fuelLiters;
                    }
                }
            }

            return {
                ...expense,
                efficiency,
                distance,
                costPerKm
            };
        });

        const avgEfficiency = totalLitersForEfficiency > 0 ? totalDistance / totalLitersForEfficiency : 0;
        const avgCostPerKm = totalDistance > 0 ? totalSpend / totalDistance : 0;

        return { 
            processedFuelData: processed, 
            stats: {
                avgEfficiency,
                avgCostPerKm,
                totalDistance,
                totalLiters,
                totalSpend
            }
        };
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
            <div className="space-y-6 pt-6 animate-in fade-in duration-700">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-[300px] w-full" />
                    <Skeleton className="h-[300px] w-full" />
                </div>
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (processedFuelData.length === 0) {
        return (
            <Card className="mt-8 border-dashed glass-card shadow-soft animate-in zoom-in-95 duration-500">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                        <Fuel className="h-10 w-10 text-primary opacity-40" />
                    </div>
                    <h3 className="text-2xl font-black tracking-tight mb-2">Vehicle Intelligence Required</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm block mx-auto font-medium">
                        Initiate tracking by adding a 'Fuel' expense. Include your odometer reading to unlock advanced efficiency mapping and cost-per-km analytics.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Executive KPI Section */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="glass-card shadow-premium border-border/40 group hover:border-primary/50 transition-all duration-500 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Gauge className="h-16 w-16 text-primary rotate-12" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            Efficiency
                        </CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-primary opacity-40 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </CardHeader>
                    <CardContent className="relative z-10 pt-2">
                        <div className="text-3xl font-black tracking-tighter text-foreground flex items-baseline gap-1">
                            {stats?.avgEfficiency.toFixed(2)}
                            <span className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest ml-1">km/L</span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground/60 mt-1">Lifetime Average</p>
                    </CardContent>
                </Card>

                <Card className="glass-card shadow-premium border-border/40 group hover:border-emerald-500/50 transition-all duration-500 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <DollarSign className="h-16 w-16 text-emerald-500 -rotate-12" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Cost Metric
                        </CardTitle>
                        <Activity className="h-4 w-4 text-emerald-500 opacity-40" />
                    </CardHeader>
                    <CardContent className="relative z-10 pt-2">
                        <div className="text-3xl font-black tracking-tighter text-foreground flex items-baseline gap-1">
                            {formatCurrency(stats?.avgCostPerKm || 0, currency)}
                            <span className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest ml-1">/km</span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-tight text-emerald-600/60 mt-1">Strategic Price Index</p>
                    </CardContent>
                </Card>

                <Card className="glass-card shadow-premium border-border/40 group hover:border-blue-500/50 transition-all duration-500 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Zap className="h-16 w-16 text-blue-500 rotate-12" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Total Miles
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 pt-2">
                        <div className="text-3xl font-black tracking-tighter text-foreground flex items-baseline gap-1">
                            {stats?.totalDistance.toLocaleString()}
                            <span className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest ml-1">km</span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-tight text-blue-600/60 mt-1">Tracked Traversal</p>
                    </CardContent>
                </Card>

                <Card className="glass-card shadow-premium border-border/40 group hover:border-orange-500/50 transition-all duration-500 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Fuel className="h-16 w-16 text-orange-500 -rotate-12" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                            Total Consumed
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 pt-2">
                        <div className="text-3xl font-black tracking-tighter text-foreground flex items-baseline gap-1">
                            {stats?.totalLiters.toFixed(1)}
                            <span className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest ml-1">Liters</span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-tight text-orange-600/60 mt-1">Gross Fuel Acquisition</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
                    <CardHeader className="pb-6">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                             <div className="h-3 w-1 bg-primary rounded-full" />
                             Price Velocity
                        </CardTitle>
                        <CardDescription className="text-sm font-medium tracking-tight mt-1">Unit price fluctuations over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[240px] w-full">
                            <LineChart data={chartData} margin={{ top: 10, left: 10, right: 10 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1}/>
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={12} fontSize={10} fontWeight="bold" className="fill-muted-foreground/60" />
                                <YAxis tickLine={false} axisLine={false} fontSize={10} fontWeight="bold" domain={['auto', 'auto']} className="fill-muted-foreground/60" />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent className="glass-card shadow-premium border-border/40 font-bold" />} />
                                <Line 
                                    dataKey="price" 
                                    type="monotone" 
                                    stroke="var(--color-price)" 
                                    strokeWidth={3} 
                                    dot={{ r: 4, fill: "var(--color-price)", strokeWidth: 0 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    className="drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]"
                                />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
                    <CardHeader className="pb-6">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                             <div className="h-3 w-1 bg-emerald-500 rounded-full" />
                             Efficiency Dynamics
                        </CardTitle>
                        <CardDescription className="text-sm font-medium tracking-tight mt-1">Fuel economy mapping (km per Liter)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[240px] w-full">
                            <LineChart data={chartData.filter((d: any) => d.efficiency !== null)} margin={{ top: 10, left: 10, right: 10 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1}/>
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={12} fontSize={10} fontWeight="bold" className="fill-muted-foreground/60" />
                                <YAxis tickLine={false} axisLine={false} fontSize={10} fontWeight="bold" domain={['auto', 'auto']} className="fill-muted-foreground/60" />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent className="glass-card shadow-premium border-border/40 font-bold" />} />
                                <Line 
                                    dataKey="efficiency" 
                                    type="monotone" 
                                    stroke="#10b981" 
                                    strokeWidth={3} 
                                    dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    className="drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                    connectNulls 
                                />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between p-6 sm:p-8">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                            Maturity History
                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Comprehensive vehicle intelligence log</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="px-0 sm:px-4 pb-8">
                    {isDesktop ? (
                        <div className="overflow-hidden rounded-xl border border-border/40 mx-4">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent border-b border-border/40">
                                        <TableHead className="text-[10px] font-bold uppercase tracking-widest px-6 py-4">Timeline</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-widest px-6 py-4">Provider</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest px-6 py-4">Odometer</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest px-6 py-4">Acquisition</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest px-6 py-4">Efficiency</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest px-6 py-4">Investment</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {efficiencyHistory.map(expense => (
                                        <TableRow key={expense.id} className="group transition-colors hover:bg-primary/5 duration-300 border-b border-border/40 last:border-0">
                                            <TableCell className="text-[11px] font-black uppercase tracking-tight text-muted-foreground px-6 py-4">
                                                {new Date((expense.date as any).toDate ? (expense.date as any).toDate() : expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </TableCell>
                                            <TableCell className="font-bold text-sm tracking-tight px-6 py-4">{expense.station || 'Direct Supply'}</TableCell>
                                            <TableCell className="text-right font-black text-sm tracking-tighter opacity-70 px-6 py-4">
                                                {expense.odometer ? `${expense.odometer.toLocaleString()} km` : '—'}
                                            </TableCell>
                                            <TableCell className="text-right px-6 py-4">
                                                <span className="text-xs font-bold">{expense.fuelLiters ? `${expense.fuelLiters.toFixed(2)}` : '—'}</span>
                                                <span className="text-[10px] font-bold text-muted-foreground/40 ml-1">L</span>
                                            </TableCell>
                                            <TableCell className="text-right px-6 py-4">
                                                {expense.efficiency ? (
                                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-black tracking-tighter rounded-lg">
                                                        {expense.efficiency.toFixed(2)} km/L
                                                    </Badge>
                                                ) : <span className="text-muted-foreground/20">—</span>}
                                            </TableCell>
                                            <TableCell className="text-right font-black text-lg tracking-tighter text-foreground group-hover:text-primary transition-colors px-6 py-4">
                                                {formatCurrency(expense.amount, currency)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="space-y-4 px-4">
                            {efficiencyHistory.map(expense => (
                                <Card key={expense.id} className="glass-card border-border/40 shadow-soft overflow-hidden group hover:border-primary/20 transition-all duration-500">
                                    <CardContent className="p-5 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <p className="font-black tracking-tight text-lg leading-tight group-hover:text-primary transition-colors">
                                                    {expense.station || 'Direct Supply'}
                                                </p>
                                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                                                    {new Date((expense.date as any).toDate ? (expense.date as any).toDate() : expense.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                                </p>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <p className="font-black text-2xl tracking-tighter text-foreground leading-none">
                                                    {formatCurrency(expense.amount, currency)}
                                                </p>
                                                {expense.efficiency && (
                                                    <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 rounded-full px-2 py-0.5">
                                                        <Activity className="h-2.5 w-2.5" />
                                                        <span className="text-[10px] font-black tracking-widest uppercase">
                                                            {expense.efficiency.toFixed(2)} km/L
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/40">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Volume</p>
                                                <p className="text-sm font-black tracking-tight">{expense.fuelLiters ? `${expense.fuelLiters.toFixed(1)} L` : '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Status</p>
                                                <p className="text-sm font-black tracking-tight whitespace-nowrap">{expense.odometer ? `${expense.odometer.toLocaleString()}` : '—'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Unit</p>
                                                <p className="text-sm font-black tracking-tight">{expense.fuelPricePerUnit ? formatCurrency(expense.fuelPricePerUnit, currency) : '—'}</p>
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
