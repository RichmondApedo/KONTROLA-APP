'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { IncomeSource, Expense, Budget, SavingsGoal } from '@/lib/types';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Loader2, ChevronRight, BrainCircuit, Calendar } from 'lucide-react';
import { generateAdvancedForecast, type AdvancedForecastOutput, type AdvancedForecastInput } from '@/ai/flows/advanced-financial-forecast';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export function StrategicForecastCard() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { profile } = useUserProfile();
    const { toast } = useToast();

    const [forecast, setForecast] = useState<AdvancedForecastOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Data fetching for AI
    const incomeQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/incomeSources`), orderBy('date', 'desc'), limit(100)) : null, [user, firestore]);
    const expensesQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/expenses`), orderBy('date', 'desc'), limit(200)) : null, [user, firestore]);
    const budgetsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/budgets`)) : null, [user, firestore]);
    const goalsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/savingsGoals`)) : null, [user, firestore]);

    const { data: income, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);
    const { data: goals, isLoading: goalsLoading } = useCollection<SavingsGoal>(goalsQuery);

    const isDataLoading = incomeLoading || expensesLoading || budgetsLoading || goalsLoading;

    const handleGenerateForecast = async () => {
        if (!user || !profile || !income || !expenses || !budgets || !goals) return;

        setIsLoading(true);
        try {
            const input: AdvancedForecastInput = {
                profile: {
                    firstName: profile.firstName,
                    plan: profile.plan,
                    preferredCurrency: profile.preferredCurrency,
                },
                allIncome: income.map(i => ({ 
                    name: i.name, 
                    amount: i.amount, 
                    date: format(new Date((i.date as any).toDate ? (i.date as any).toDate() : i.date), 'yyyy-MM-dd')
                })),
                allExpenses: expenses.map(e => ({
                    description: e.description,
                    amount: e.amount,
                    category: e.category,
                    date: format(new Date((e.date as any).toDate ? (e.date as any).toDate() : e.date), 'yyyy-MM-dd')
                })),
                allBudgets: budgets.map(b => ({
                    name: b.name,
                    amount: b.amount,
                    period: b.period,
                    category: b.category,
                })),
                allSavingsGoals: goals.map(g => ({
                    name: g.name,
                    currentAmount: g.currentAmount,
                    targetAmount: g.targetAmount,
                })),
            };

            const result = await generateAdvancedForecast(input);
            setForecast(result);
            toast({ title: 'Strategic Forecast Ready!', description: 'AI has analyzed your data and generated a 3-month outlook.' });
        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Forecast Failed', description: error.message || 'Could not generate forecast. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    if (isDataLoading) {
        return <Skeleton className="h-[200px] w-full" />;
    }

    return (
        <Card className="h-full border-primary/20 bg-gradient-to-br from-background to-primary/5">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] items-center gap-1 border-primary/30 text-primary">
                        <BrainCircuit className="h-3 w-3" />
                        AI Strategic Advisor
                    </Badge>
                    {forecast && (
                         <Button variant="ghost" size="sm" onClick={() => setForecast(null)} className="h-6 text-[10px]">
                            Clear
                        </Button>
                    )}
                </div>
                <CardTitle className="text-lg font-bold mt-2 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Strategic Outlook
                </CardTitle>
                <CardDescription className="text-xs">
                    Predictive cash flow and growth analysis.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!forecast ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Ready for deep analysis?</p>
                            <p className="text-[10px] text-muted-foreground px-4">
                                Our AI will analyze your income patterns and spending history to project your financial future.
                            </p>
                        </div>
                        <Button onClick={handleGenerateForecast} disabled={isLoading} size="sm" className="w-full sm:w-auto">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate Forecast
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-3 bg-muted/50 rounded-lg space-y-2 border border-border/50">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-wider">
                                <Calendar className="h-3 w-3" />
                                3-Month Projection
                            </div>
                            <p className="text-xs leading-relaxed text-foreground/90 italic">
                                "{forecast.shortTermForecast.length > 150 ? forecast.shortTermForecast.substring(0, 150) + '...' : forecast.shortTermForecast}"
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2">
                             {forecast.actionableAdvice.slice(0, 2).map((advice, i) => (
                                <div key={i} className="flex gap-2 p-2 bg-primary/5 rounded border border-primary/10">
                                    <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                        {i + 1}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        <span className="font-semibold text-foreground">Strategic Tip:</span> {advice}
                                    </p>
                                </div>
                             ))}
                        </div>
                    </div>
                )}
            </CardContent>
            {forecast && (
                <CardFooter className="pt-0 border-t border-border/50 mt-4 h-10 px-6">
                    <Button variant="link" size="sm" className="w-full text-[10px] h-auto p-0 text-primary font-bold">
                        View Full Analysis Report <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
