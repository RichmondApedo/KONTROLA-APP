'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { 
    Wallet, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    TrendingUp, 
    AlertCircle,
    BadgeAlert,
    Clock,
    Zap
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface WorkingCapitalTerminalProps {
    totalCash: number;
    receivables: number; // What customers owe (Unpaid Invoices)
    payables: number;    // What you owe vendors (Unpaid Bills)
    currency: string;
    avgDaysToPay?: number;
}

export function WorkingCapitalTerminal({ 
    totalCash, 
    receivables, 
    payables, 
    currency,
    avgDaysToPay = 14
}: WorkingCapitalTerminalProps) {
    const netWorkingCapital = totalCash + receivables - payables;
    const liquidityRatio = totalCash > 0 ? (receivables / totalCash) * 100 : 0;
    
    const riskLevel = useMemo(() => {
        if (payables > (totalCash + (receivables * 0.5))) return 'High';
        if (payables > totalCash) return 'Medium';
        return 'Low';
    }, [totalCash, receivables, payables]);

    return (
        <div className="space-y-6">
            {/* Primary Net Position Card */}
            <Card className={cn(
                "bg-card shadow-sm border transition-all duration-300",
                netWorkingCapital < 0 ? "border-destructive/50 bg-destructive/[0.02]" : "border-border hover:border-primary/50"
            )}>
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                    <TrendingUp className={cn("h-24 w-24", netWorkingCapital < 0 ? "text-destructive" : "text-primary")} />
                </div>
                
                <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", netWorkingCapital < 0 ? "bg-destructive" : "bg-primary")} />
                        Capital Liquidity Health
                    </CardTitle>
                    <CardDescription className="text-[11px] font-medium text-muted-foreground/60 mt-1 italic">
                        Real-time status of your available business cash.
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-2 pb-4 sm:pb-6">
                    <div className={cn(
                        "text-2xl sm:text-3xl font-black tracking-tighter transition-colors",
                         netWorkingCapital < 0 ? "text-destructive" : "text-foreground group-hover:text-primary"
                    )}>
                        {formatCurrency(netWorkingCapital, currency)}
                    </div>
                    
                    {netWorkingCapital < 0 && (
                        <div className="mt-2 flex items-center gap-1.5 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                            <p className="text-[10px] sm:text-[11px] font-bold text-destructive/90 leading-tight break-words">
                                Danger: You owe more to vendors than your total cash and expected invoice payments combined.
                            </p>
                        </div>
                    )}
                    
                    <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase text-muted-foreground/60 flex items-center gap-1.5">
                                <ArrowUpCircle className="h-3 w-3 text-emerald-500" />
                                From Customers (Invoices)
                            </p>
                            <p className="text-sm font-black text-emerald-500">{formatCurrency(receivables, currency)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase text-muted-foreground/60 flex items-center gap-1.5">
                                <ArrowDownCircle className="h-3 w-3 text-destructive" />
                                Owed to Vendors (Bills)
                            </p>
                            <p className="text-sm font-black text-destructive">{formatCurrency(payables, currency)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Performance Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-card shadow-sm border-border">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <BadgeAlert className={cn(
                                    "h-4 w-4",
                                    riskLevel === 'High' ? "text-destructive" : riskLevel === 'Medium' ? "text-amber-500" : "text-emerald-500"
                                )} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Liquidity Risk</span>
                            </div>
                            <span className={cn(
                                "text-[10px] font-black px-2 py-0.5 rounded-md",
                                riskLevel === 'High' ? "bg-destructive text-white" : riskLevel === 'Medium' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                            )}>
                                {riskLevel}
                            </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                            {riskLevel === 'High' ? "Danger: Liabilities exceed cash + near-term receivables." : riskLevel === 'Medium' ? "Warning: Payables are increasing relative to cash." : "Healthy standing: Your liquidity covers all outstanding payables."}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-border">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Collection Speed</span>
                            </div>
                            <span className="text-xs font-black">{avgDaysToPay} Days</span>
                        </div>
                        <Progress value={Math.max(10, 100 - (avgDaysToPay * 2))} className="h-1 bg-muted" />
                        <p className="text-[10px] text-muted-foreground mt-2 italic">Avg. days until invoices are paid.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
