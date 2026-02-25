'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import type { IncomeSource, Expense, Budget } from '@/lib/types';
import { subMonths, startOfMonth, endOfMonth, getMonth, getYear } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gauge, Share2, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// Constants for score calculation
const SCORE_MAX = 1000;
const SAVINGS_RATIO_WEIGHT = 0.4;
const EXPENSE_DISCIPLINE_WEIGHT = 0.3;
const INCOME_CONSISTENCY_WEIGHT = 0.3;

// --- Score Calculation Logic ---
function calculateKontrolaScore(income: IncomeSource[], expenses: Expense[], budgets: Budget[]) {
    // 1. Savings Ratio (last 6 months)
    const totalIncome = income.reduce((acc, i) => acc + i.amount, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const savings = totalIncome - totalExpenses;
    const savingsRatio = totalIncome > 0 ? savings / totalIncome : 0;
    
    let savingsScore = 0;
    if (savingsRatio >= 0.2) savingsScore = 1;
    else if (savingsRatio >= 0.1) savingsScore = 0.75;
    else if (savingsRatio >= 0.05) savingsScore = 0.5;
    else if (savingsRatio >= 0) savingsScore = 0.25;
    else savingsScore = 0;

    // 2. Expense Discipline (based on last month's budgets)
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
    const lastMonthBudgets = budgets.filter(b => {
        const startDate = (b.startDate as any).toDate();
        return getMonth(startDate) === getMonth(lastMonthStart) && getYear(startDate) === getYear(lastMonthStart);
    });

    let metBudgets = 0;
    if (lastMonthBudgets.length > 0) {
        lastMonthBudgets.forEach(budget => {
            const budgetExpenses = expenses.filter(e => {
                 const expenseDate = (e.date as any).toDate();
                 const budgetStartDate = (budget.startDate as any).toDate();
                 const budgetEndDate = (budget.endDate as any).toDate();
                 const isAfterStart = expenseDate >= budgetStartDate;
                 const isBeforeEnd = expenseDate <= budgetEndDate;
                 const isMatchingCategory = budget.category === 'Overall' || e.category === budget.category;
                 return isAfterStart && isBeforeEnd && isMatchingCategory;
            });
            const totalSpent = budgetExpenses.reduce((sum, e) => sum + e.amount, 0);
            if (totalSpent <= budget.amount) {
                metBudgets++;
            }
        });
        
    }
    const disciplineScore = lastMonthBudgets.length > 0 ? metBudgets / lastMonthBudgets.length : 0.5; // Default to 0.5 if no budgets

    // 3. Income Consistency (over last 6 months)
    const monthsWithIncome = new Set();
    income.forEach(i => {
        const incomeDate = (i.date as any).toDate();
        monthsWithIncome.add(`${getYear(incomeDate)}-${getMonth(incomeDate)}`);
    });
    const consistencyScore = monthsWithIncome.size / 6;

    const finalScore = 
        (savingsScore * SAVINGS_RATIO_WEIGHT) + 
        (disciplineScore * EXPENSE_DISCIPLINE_WEIGHT) + 
        (consistencyScore * INCOME_CONSISTENCY_WEIGHT);

    return {
        score: Math.round(finalScore * SCORE_MAX),
        savingsRatio: savingsRatio,
        disciplineRatio: lastMonthBudgets.length > 0 ? metBudgets / lastMonthBudgets.length : null,
        consistencyRatio: consistencyScore,
    };
}


// --- Main Component ---
export default function KontrolaScorePage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [scoreResult, setScoreResult] = useState<{ score: number; savingsRatio: number; disciplineRatio: number | null; consistencyRatio: number; } | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // --- Data Fetching ---
    const sixMonthsAgo = useMemo(() => Timestamp.fromDate(subMonths(new Date(), 6)), []);
    
    const incomeQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/incomeSources`), where('date', '>=', sixMonthsAgo)) : null, [user, firestore, sixMonthsAgo]);
    const expensesQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/expenses`), where('date', '>=', sixMonthsAgo)) : null, [user, firestore, sixMonthsAgo]);
    const budgetsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/budgets`), where('endDate', '>=', sixMonthsAgo)) : null, [user, firestore, sixMonthsAgo]);

    const { data: income, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);

    const isLoading = incomeLoading || expensesLoading || budgetsLoading;
    
    useEffect(() => {
        if (!isLoading && income && expenses && budgets) {
             setIsCalculating(true);
             setTimeout(() => { // Simulate calculation time for better UX
                const result = calculateKontrolaScore(income, expenses, budgets);
                setScoreResult(result);
                setIsCalculating(false);
             }, 500);
        }
    }, [isLoading, income, expenses, budgets]);


    const handleShare = async () => {
        if (!scoreResult) return;
        const shareData = {
            title: 'My Kontrola Score',
            text: `I just checked my financial health with Kontrola and got a score of ${scoreResult.score}/1000! See how you stack up. #KontrolaScore`,
            url: 'https://kontrolaapp.com',
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback for desktop
                await navigator.clipboard.writeText(shareData.text + ' ' + shareData.url);
                toast({ title: "Copied to clipboard!", description: "Share your score with your friends." });
            }
        } catch (error) {
            console.error('Error sharing:', error);
            toast({ variant: 'destructive', title: "Couldn't share", description: 'Something went wrong.' });
        }
    };
    
    const getScoreColor = (score: number) => {
        if (score > 750) return 'text-green-500';
        if (score > 500) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Kontrola Score</h1>
                <p className="text-muted-foreground">Your proprietary financial health score, updated in real-time.</p>
            </div>
            
            {(isLoading || isCalculating) && 
                <div className="space-y-6">
                    <Skeleton className="h-64 w-full" />
                    <div className="grid gap-6 md:grid-cols-3">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                </div>
            }

            {!isLoading && !isCalculating && scoreResult && (
                <div className="space-y-6">
                     <Card className="relative">
                        <CardHeader className="text-center">
                            <CardTitle className="text-lg font-medium">Your Kontrola Score is</CardTitle>
                            <CardDescription>A measure of your financial health from 0 to 1000.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center gap-4">
                            <div className={`text-7xl font-bold ${getScoreColor(scoreResult.score)}`}>
                                {scoreResult.score}
                            </div>
                             <Button onClick={handleShare} className="absolute top-4 right-4" variant="outline" size="icon">
                                <Share2 className="h-4 w-4" />
                                <span className="sr-only">Share Score</span>
                            </Button>
                        </CardContent>
                    </Card>

                     <div className="grid gap-6 md:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base"><TrendingUp/> Savings Ratio</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-3xl font-bold">{(scoreResult.savingsRatio * 100).toFixed(1)}%</p>
                                <p className="text-sm text-muted-foreground">You saved this percentage of your income in the last 6 months.</p>
                                <Progress value={scoreResult.savingsRatio * 100} />
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base"><Target/> Expense Discipline</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-3xl font-bold">{scoreResult.disciplineRatio !== null ? `${(scoreResult.disciplineRatio * 100).toFixed(0)}%` : 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">You met this percentage of your budgets last month.</p>
                                <Progress value={scoreResult.disciplineRatio !== null ? scoreResult.disciplineRatio * 100 : 0} />
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base"><TrendingDown/> Income Consistency</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-3xl font-bold">{Math.round(scoreResult.consistencyRatio * 100)}%</p>
                                <p className="text-sm text-muted-foreground">You had income in {Math.round(scoreResult.consistencyRatio * 6)} of the last 6 months.</p>
                                <Progress value={scoreResult.consistencyRatio * 100} />
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Track & Benchmark</CardTitle>
                            <CardDescription>See how your score trends over time and compares to others.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
                            <p>Score history and benchmarking charts coming soon!</p>
                        </CardContent>
                    </Card>
                </div>
            )}
            
             {!isLoading && !isCalculating && !scoreResult && (
                <Card>
                    <CardContent className="text-center text-muted-foreground py-10">
                        <p>Not enough data to calculate your score.</p>
                        <p className="text-sm">Start by adding your income and expenses for at least one month.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
