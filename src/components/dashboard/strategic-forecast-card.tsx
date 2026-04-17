'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { IncomeSource, Expense, Budget, SavingsGoal } from '@/lib/types';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Loader2, ChevronRight, BrainCircuit, Calendar, X } from 'lucide-react';
import { generateAdvancedForecast, type AdvancedForecastOutput, type AdvancedForecastInput } from '@/ai/flows/advanced-financial-forecast';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { UpgradePlanDialog } from './upgrade-plan-dialog';

/**
 * Robustly formats any date-like value (Firestore Timestamp, JS Date, ISO string).
 * Prevents "Invalid Date" crashes that often cause Application Errors.
 */
function safeFormatDate(d: any): string {
    if (!d) return '';
    try {
        const dateObj = d.toDate ? d.toDate() : new Date(d);
        if (isNaN(dateObj.getTime())) return '';
        return format(dateObj, 'yyyy-MM-dd');
    } catch {
        return '';
    }
}

export function StrategicForecastCard() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { profile } = useUserProfile();
    const { toast } = useToast();

    const [forecast, setForecast] = useState<AdvancedForecastOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Data fetching for AI
    const incomeQuery = useMemo(() => user && firestore ? query(
        collection(firestore, `users/${user.uid}/incomeSources`), 
        where('context', '!=', 'business'),
        orderBy('context'), // Required for inequality filters in some Firestore setups
        orderBy('date', 'desc'), 
        limit(100)
    ) : null, [user, firestore]);
    
    const expensesQuery = useMemo(() => user && firestore ? query(
        collection(firestore, `users/${user.uid}/expenses`), 
        where('context', '!=', 'business'),
        orderBy('context'),
        orderBy('date', 'desc'), 
        limit(200)
    ) : null, [user, firestore]);
    const budgetsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/budgets`)) : null, [user, firestore]);
    const goalsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/savingsGoals`)) : null, [user, firestore]);
    const billsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/bills`), where('status', '==', 'unpaid')) : null, [user, firestore]);
    const accountsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/linkedAccounts`)) : null, [user, firestore]);

    const { data: income, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);
    const { data: goals, isLoading: goalsLoading } = useCollection<SavingsGoal>(goalsQuery);
    const { data: bills, isLoading: billsLoading } = useCollection<any>(billsQuery);
    const { data: accounts, isLoading: accountsLoading } = useCollection<any>(accountsQuery);

    const isDataLoading = incomeLoading || expensesLoading || budgetsLoading || goalsLoading || billsLoading || accountsLoading;

    const hasAIAccess = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || (profile?.role as string) === 'admin';

    const [hasMounted, setHasMounted] = useState(false);
    useEffect(() => { setHasMounted(true); }, []);

    if (isDataLoading || !hasMounted) {
        return <Skeleton className="h-[200px] w-full" />;
    }

    const handleGenerateForecast = async () => {
        if (!user || !profile || !income || !expenses) return;

        if (!hasAIAccess) {
            toast({ 
                variant: 'destructive', 
                title: 'Premium Feature', 
                description: 'Please upgrade to Premium or Pro Plus to access Strategic Deep Analysis.' 
            });
            return;
        }

        setIsLoading(true);
        try {
            const input: AdvancedForecastInput = {
                profile: {
                    firstName: profile?.firstName || 'User',
                    plan: profile?.plan || 'free',
                    preferredCurrency: profile?.preferredCurrency || 'GHS',
                },
                allIncome: (income || []).map(i => ({ 
                    name: i?.name || 'Income', 
                    amount: i?.amount || 0, 
                    date: safeFormatDate(i?.date)
                })),
                allExpenses: (expenses || []).map(e => ({
                    description: e?.description || 'Expense',
                    amount: e?.amount || 0,
                    category: e?.category || 'Other',
                    date: safeFormatDate(e?.date)
                })),
                allBudgets: (budgets || []).map(b => ({
                    name: b?.name || 'Budget',
                    amount: b?.amount || 0,
                    period: b?.period || 'monthly',
                    category: b?.category || 'Overall',
                })),
                allSavingsGoals: (goals || []).map(g => ({
                    name: g?.name || 'Goal',
                    currentAmount: g?.currentAmount || 0,
                    targetAmount: g?.targetAmount || 0,
                })),
                allBills: (bills || []).map(b => ({
                    name: b?.name || 'Bill',
                    amount: b?.amount || 0,
                    dueDate: safeFormatDate(b?.dueDate),
                    status: b?.status || 'unpaid',
                })),
                allAccounts: (accounts || []).map(a => ({
                    institutionName: a?.institutionName || 'Bank',
                    accountName: a?.accountName || 'Account',
                    balance: a?.balance || 0,
                    currency: a?.currency || 'GHS',
                })),
            };

            const result = await generateAdvancedForecast(input);
            setForecast(result);
            toast({ title: 'Strategic Forecast Ready!', description: 'The system has analyzed your data and generated a 3-month outlook.' });
        } catch (error: any) {
            console.error("Forecast Execution Error:", error);
            toast({ variant: 'destructive', title: 'Forecast Failed', description: error.message || 'Could not generate forecast. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5 shadow-premium glass-card relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 blur-3xl rounded-full group-hover:bg-primary/20 transition-all duration-700" />
            <CardHeader className="pb-3 relative z-10 px-4 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 shrink-0">
                        <BrainCircuit className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Strategic Advisor</span>
                    </div>
                    {forecast && (
                         <Button variant="ghost" size="sm" onClick={() => setForecast(null)} className="h-7 w-7 sm:w-auto p-0 sm:px-3 text-[10px] font-bold uppercase tracking-wider bg-background/40 hover:bg-background/80 rounded-lg">
                            <span className="hidden sm:inline">Reset</span>
                            <X className="h-3.5 w-3.5 sm:hidden" />
                        </Button>
                    )}
                </div>
                <CardTitle className="text-xl font-black mt-4 flex items-center gap-2 tracking-tight">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    Growth Outlook
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs font-medium opacity-70">
                    Neural-engine 90-day predictive analysis.
                </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
                {!forecast ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
                        <div className="relative">
                            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                            <div className="relative p-5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl border border-primary/20 shadow-lg">
                                <Sparkles className="h-10 w-10 text-primary" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold uppercase tracking-tight">Unlock Strategic Insights</h3>
                            <p className="text-[11px] leading-relaxed text-muted-foreground px-6 font-medium">
                                {hasAIAccess 
                                    ? "Our neural engine analyzes your income velocity and spending patterns to project your financial destiny."
                                    : "Strategic projections are available exclusively for Premium and Pro Plus members. Analyze your data to prepare for the future."
                                }
                            </p>
                        </div>

                        {!hasAIAccess ? (
                            <UpgradePlanDialog featureName="Strategic Deep Analysis">
                                <Button 
                                    size="lg" 
                                    className="w-full shadow-lg shadow-primary/20 font-bold hover:scale-[1.02] transition-transform"
                                >
                                    <Sparkles className="mr-2 h-5 w-5" />
                                    Run Deep Analysis
                                </Button>
                            </UpgradePlanDialog>
                        ) : (
                            <Button 
                                onClick={handleGenerateForecast} 
                                disabled={isLoading} 
                                size="lg" 
                                className="w-full shadow-lg shadow-primary/20 font-bold hover:scale-[1.02] transition-transform"
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                                Run Deep Analysis
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="p-4 bg-background/40 backdrop-blur-sm rounded-2xl space-y-3 border border-border/40 shadow-inner">
                            <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 w-fit px-2 py-0.5 rounded-md">
                                <Calendar className="h-3 w-3" />
                                90-Day Projection
                            </div>
                            <p className="text-xs sm:text-[13px] leading-relaxed font-bold tracking-tight text-foreground/90 italic break-words">
                                "{forecast.shortTermForecast.length > 180 ? forecast.shortTermForecast.substring(0, 180) + '...' : forecast.shortTermForecast}"
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2.5">
                             {forecast.actionableAdvice.slice(0, 2).map((advice, i) => (
                                <div key={i} className="flex gap-2.5 p-3 bg-primary/5 rounded-2xl border border-primary/10 hover:bg-primary/10 transition-colors">
                                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary shrink-0 shadow-sm mt-0.5">
                                        {i + 1}
                                    </div>
                                    <p className="text-[10px] sm:text-[11px] leading-tight font-medium text-muted-foreground break-words pr-1">
                                        <span className="font-black text-foreground uppercase text-[9px] tracking-widest mr-1 opacity-70">Strategy:</span> 
                                        {advice}
                                    </p>
                                </div>
                             ))}
                        </div>
                    </div>
                )}
            </CardContent>
            {forecast && (
                <CardFooter className="pt-0 pb-6 relative z-10 px-6">
                    <Button variant="outline" size="sm" className="w-full text-[11px] font-bold rounded-xl border-primary/20 text-primary hover:bg-primary/10 transition-all">
                        View Full Forecast <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
