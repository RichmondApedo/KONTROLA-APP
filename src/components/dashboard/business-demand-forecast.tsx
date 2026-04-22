'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    TrendingUp, 
    Sparkles, 
    Loader2, 
    Zap, 
    ArrowRight, 
    BarChart3, 
    Target, 
    LineChart,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { IncomeSource, Expense, Invoice, Customer } from '@/lib/types';
import { generateDemandForecast, type DemandForecastOutput } from '@/ai/flows/demand-forecast-flow';
import { useToast } from '@/hooks/use-toast';
import { cn, formatCurrency, safeFormatDate } from '@/lib/utils';
import { Progress } from '../ui/progress';

export function BusinessDemandForecast() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { activeProfile, activeProfileId } = useUserProfile();
    const { toast } = useToast();

    const [forecast, setForecast] = useState<DemandForecastOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const targetUid = activeProfileId || user?.uid;
    const currency = activeProfile?.preferredCurrency || 'ghs';

    // Business-Specific Data Fetching
    const salesQuery = useMemo(() => targetUid && firestore ? query(
        collection(firestore, `users/${targetUid}/incomeSources`),
        where('context', '==', 'business'),
        orderBy('date', 'desc'),
        limit(100)
    ) : null, [targetUid, firestore]);

    const expenseQuery = useMemo(() => targetUid && firestore ? query(
        collection(firestore, `users/${targetUid}/expenses`),
        where('context', '==', 'business'),
        orderBy('date', 'desc'),
        limit(100)
    ) : null, [targetUid, firestore]);

    const invoicesQuery = useMemo(() => targetUid && firestore ? query(
        collection(firestore, `users/${targetUid}/invoices`),
        limit(50)
    ) : null, [targetUid, firestore]);

    const customersQuery = useMemo(() => targetUid && firestore ? query(
        collection(firestore, `users/${targetUid}/customers`),
        limit(50)
    ) : null, [targetUid, firestore]);

    const { data: sales, isLoading: salesLoading } = useCollection<IncomeSource>(salesQuery);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expenseQuery);
    const { data: invoices, isLoading: invoicesLoading } = useCollection<Invoice>(invoicesQuery);
    const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

    const isDataLoading = salesLoading || expensesLoading || invoicesLoading || customersLoading;

    const handleGenerateDemandForecast = async () => {
        if (!targetUid || !activeProfile || !sales) {
            toast({ variant: 'destructive', title: 'Data Missing', description: 'At least some sales data is required for forecasting.' });
            return;
        }

        setIsLoading(true);
        try {
            const result = await generateDemandForecast({
                profile: {
                    businessName: activeProfile.businessName || 'Your Business',
                    preferredCurrency: activeProfile.preferredCurrency || 'GHS',
                },
                allSales: sales.map(s => ({ name: s.name, amount: s.amount, date: safeFormatDate(s.date) })),
                businessExpenses: (expenses || []).map(e => ({ description: e.description, amount: e.amount, category: e.category, date: safeFormatDate(e.date) })),
                openInvoices: (invoices || []).filter(i => i.status !== 'paid').map(i => ({ customerName: i.customerName, totalAmount: i.totalAmount, status: i.status, dueDate: safeFormatDate(i.dueDate) })),
                recentCustomers: (customers || []).map(c => ({ name: c.name, totalPurchases: c.totalRevenue, lastPurchaseDate: safeFormatDate(c.lastPurchaseDate) })),
            });
            
            if (result.error) {
                toast({ variant: 'destructive', title: 'Neural Engine Busy', description: result.error });
            } else {
                setForecast(result);
                toast({ title: 'Demand Prediction Ready', description: 'Strategic growth vectors have been identified based on your sales patterns.' });
            }
        } catch (error: any) {
            console.error("Demand Forecast Error:", error);
            toast({ variant: 'destructive', title: 'Neural Engine Busy', description: 'The Strategic Advisor is temporarily unavailable. Please try again later.' });
        } finally {
            setIsLoading(false);
        }
    };

    if (isDataLoading) {
        return (
            <Card className="animate-pulse bg-card/50 border-border/40">
                <div className="h-80 w-full rounded-2xl bg-muted/20" />
            </Card>
        );
    }

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-premium glass-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <BarChart3 className="h-48 w-48 text-primary" />
            </div>

            <CardHeader className="pb-4 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <Zap className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Strategic Intelligence</span>
                    </div>
                </div>
                <CardTitle className="text-2xl font-black mt-4 flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    Demand Forecasting
                </CardTitle>
                <CardDescription className="font-medium text-xs opacity-70 italic">
                    Neural projections of sales velocity and growth drivers.
                </CardDescription>
            </CardHeader>

            <CardContent className="relative z-10 pb-6">
                {!forecast ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-8 animate-in fade-in duration-1000">
                        <div className="relative">
                            <div className="absolute -inset-6 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                            <div className="relative p-6 bg-primary/5 rounded-[2.5rem] border border-primary/20 shadow-inner">
                                <Sparkles className="h-12 w-12 text-primary" />
                            </div>
                        </div>
                        <div className="space-y-2 max-w-sm">
                            <h3 className="font-black text-sm uppercase tracking-tight">Predict Your Revenue Destiny</h3>
                            <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                                Analyze your business context, invoice lifecycle, and sales patterns to predict demand for the next 90 days.
                            </p>
                        </div>
                        <Button 
                            onClick={handleGenerateDemandForecast} 
                            disabled={isLoading}
                            size="lg" 
                            className="w-full sm:w-64 shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs h-14 rounded-2xl hover:scale-105 active:scale-95 transition-all"
                        >
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                            {isLoading ? 'Processing Intelligence...' : 'Run Demand Analysis'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Demand Curve visualization */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Predicted Revenue Curve</h4>
                                <BadgeAlert className="h-3.5 w-3.5 text-primary/40" />
                            </div>
                            <div className="flex flex-col gap-4">
                                {forecast.demandCurve.map((item, i) => (
                                    <div key={i} className="space-y-1.5 p-4 bg-background/40 rounded-2xl border border-border/40 hover:border-primary/30 transition-all group/item">
                                        <div className="flex justify-between items-end mb-1">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">{item.period}</span>
                                                <span className="text-xl font-black text-foreground group-hover/item:text-primary transition-colors">
                                                    {formatCurrency(item.predictedRevenue, currency)}
                                                </span>
                                            </div>
                                            <div className={cn(
                                                "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest",
                                                item.confidence === 'High' ? "bg-emerald-500/10 text-emerald-500" :
                                                item.confidence === 'Medium' ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
                                            )}>
                                                {item.confidence} Confidence
                                            </div>
                                        </div>
                                        <Progress value={i === 0 ? 100 : i === 1 ? 85 : 65} className="h-1.5 bg-primary/5" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Strategic Advice */}
                        <div className="space-y-4">
                            <Button 
                                variant="ghost" 
                                className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Strategic Growth Vectors</h4>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            
                            {(isExpanded ? forecast.strategicAdvice : forecast.strategicAdvice.slice(0, 2)).map((advice, i) => (
                                <div key={i} className="flex gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors group/advice">
                                    <div className="h-10 w-10 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center group-hover/advice:scale-110 transition-transform">
                                        <Target className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">{advice.area}</p>
                                        <p className="text-xs font-bold text-foreground/90 leading-relaxed italic">"{advice.recommendation}"</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Seasonal Analysis */}
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <LineChart className="h-4 w-4 text-muted-foreground/60" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Market Cyclicality</span>
                            </div>
                            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                                {forecast.seasonalTrends}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>

            {forecast && (
                <CardFooter className="pt-0 pb-8 relative z-10 px-6 sm:px-8">
                    <Button 
                        onClick={() => setForecast(null)} 
                        variant="outline" 
                        size="sm" 
                        className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border-primary/20 text-primary hover:bg-primary/5 transition-all"
                    >
                         Reset Neural Analysis <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}

function BadgeAlert(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}
