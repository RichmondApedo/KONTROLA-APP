'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { IncomeSource, Expense, Budget, SavingsGoal } from '@/lib/types';
import { getMonth, getYear } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, TrendingUp, Target, Repeat, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Constants for score calculation
const SCORE_MAX = 1000;
const SAVINGS_RATIO_WEIGHT = 0.3;
const EXPENSE_DISCIPLINE_WEIGHT = 0.3;
const INCOME_CONSISTENCY_WEIGHT = 0.2;
const GOAL_ACHIEVEMENT_WEIGHT = 0.2;


// --- Score Calculation Logic ---
function calculateKontrolaScore(income: IncomeSource[], expenses: Expense[], budgets: Budget[], savingsGoals: SavingsGoal[]) {
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

    // 2. Expense Discipline (based on recently completed budgets)
    const now = new Date();
    const completedBudgets = budgets.filter(b => {
        const budgetEndDate = (b.endDate as any).toDate ? (b.endDate as any).toDate() : new Date(b.endDate as string);
        return budgetEndDate < now;
    });

    let metBudgets = 0;
    if (completedBudgets.length > 0) {
        completedBudgets.forEach(budget => {
            const budgetStartDate = (budget.startDate as any).toDate ? (budget.startDate as any).toDate() : new Date(budget.startDate as string);
            const budgetEndDate = (budget.endDate as any).toDate ? (budget.endDate as any).toDate() : new Date(budget.endDate as string);

            const budgetExpenses = expenses.filter(e => {
                 const expenseDate = (e.date as any).toDate ? (e.date as any).toDate() : new Date(e.date as string);
                 return expenseDate >= budgetStartDate && expenseDate <= budgetEndDate && (budget.category === 'Overall' || e.category === budget.category);
            });
            const totalSpent = budgetExpenses.reduce((sum, e) => sum + e.amount, 0);
            if (totalSpent <= budget.amount) {
                metBudgets++;
            }
        });
    }
    const disciplineScore = completedBudgets.length > 0 ? metBudgets / completedBudgets.length : 0.5; // Default if no budgets completed

    // 3. Income Consistency (over last 6 months)
    const monthsWithIncome = new Set();
    income.forEach(i => {
        const incomeDate = (i.date as any).toDate ? (i.date as any).toDate() : new Date(i.date as string);
        monthsWithIncome.add(`${getYear(incomeDate)}-${getMonth(incomeDate)}`);
    });
    const consistencyScore = monthsWithIncome.size / 6;

    // 4. Goal Achievement
    let goalAchievementScore = 0.5; // Default score if no goals are set
    if (savingsGoals && savingsGoals.length > 0) {
        const totalProgress = savingsGoals.reduce((acc, goal) => {
            if (goal.targetAmount > 0) {
                const progress = goal.currentAmount / goal.targetAmount;
                return acc + Math.min(progress, 1); // Cap progress at 100% for calculation
            }
            return acc;
        }, 0);
        goalAchievementScore = totalProgress / savingsGoals.length;
    }

    const finalScore = 
        (savingsScore * SAVINGS_RATIO_WEIGHT) + 
        (disciplineScore * EXPENSE_DISCIPLINE_WEIGHT) + 
        (consistencyScore * INCOME_CONSISTENCY_WEIGHT) +
        (goalAchievementScore * GOAL_ACHIEVEMENT_WEIGHT);

    return {
        score: Math.round(finalScore * SCORE_MAX),
        savingsRatio: savingsRatio,
        disciplineRatio: completedBudgets.length > 0 ? metBudgets / completedBudgets.length : null,
        consistencyRatio: consistencyScore,
        goalAchievementRatio: savingsGoals && savingsGoals.length > 0 ? goalAchievementScore : null
    };
}


// --- HELPER FUNCTIONS & COMPONENT ---

const getScoreHslColor = (score: number) => {
    if (score > 750) return 'hsl(var(--chart-1))'; // Green from theme
    if (score > 500) return 'hsl(45 95% 51%)';    // Gold/Yellow
    return 'hsl(var(--destructive))';            // Red from theme
};

const getScoreTitle = (score: number) => {
    if (score > 750) return 'Excellent!';
    if (score > 500) return 'Looking Good!';
    return 'Needs Improvement';
};

const getScoreDescription = (score: number) => {
    if (score > 750) return 'You have a strong financial standing. Keep up the great habits!';
    if (score > 500) return 'You are on the right track. Continue to build healthy financial habits.';
    return 'There are opportunities to improve your financial health. Focus on the areas below.';
};

function ScoreGauge({ score, color }: { score: number, color: string }) {
    const data = [
        { name: 'score', value: score, fill: color },
        { name: 'empty', value: 1000 - score, fill: 'hsl(var(--muted))' }
    ];

    return (
        <ChartContainer
            config={{}}
            className="mx-auto aspect-square h-[200px] w-[200px]"
        >
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        startAngle={210}
                        endAngle={-30}
                        innerRadius="80%"
                        outerRadius="100%"
                        cornerRadius={99}
                        cy="50%"
                    >
                        {data.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={entry.fill} stroke={entry.fill} />
                        ))}
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
                                                className="text-5xl font-bold"
                                                style={{ fill: color }}
                                            >
                                                {score}
                                            </tspan>
                                            <tspan
                                                x={viewBox.cx}
                                                y={(viewBox.cy || 0) + 20}
                                                className="text-xs fill-muted-foreground"
                                            >
                                                / 1000
                                            </tspan>
                                        </text>
                                    );
                                }
                            }}
                        />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
}


// --- Main Component ---
export default function KontrolaScorePage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [scoreResult, setScoreResult] = useState<{ score: number; savingsRatio: number; disciplineRatio: number | null; consistencyRatio: number; goalAchievementRatio: number | null; } | null>(null);
    const [isCalculating, setIsCalculating] = useState(true);

    // --- Data Fetching ---
    const incomeQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/incomeSources`)) : null, [user, firestore]);
    const expensesQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/expenses`)) : null, [user, firestore]);
    const budgetsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/budgets`)) : null, [user, firestore]);
    const savingsGoalsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/savingsGoals`)) : null, [user, firestore]);

    const { data: income, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);
    const { data: savingsGoals, isLoading: goalsLoading } = useCollection<SavingsGoal>(savingsGoalsQuery);

    const isLoading = incomeLoading || expensesLoading || budgetsLoading || goalsLoading;
    
    useEffect(() => {
        if (!isLoading && income && expenses && budgets && savingsGoals) {
            setIsCalculating(true);
            const result = calculateKontrolaScore(income, expenses, budgets, savingsGoals);
            setScoreResult(result);
            setIsCalculating(false);
        } else if (!isLoading) {
            setIsCalculating(false);
        }
    }, [isLoading, income, expenses, budgets, savingsGoals]);


    const handleShare = async () => {
        if (!scoreResult) return;
        const shareData = {
            title: 'My Kontrola Score',
            text: `I'm building better financial habits with Kontrola and my score is ${scoreResult.score}/1000! How's your financial health? #KontrolaScore #FinancialHealth`,
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
        } catch (error: any) {
            if (error.name === 'NotAllowedError') {
                console.warn('Web Share API permission denied, falling back to clipboard.');
                try {
                    await navigator.clipboard.writeText(shareData.text + ' ' + shareData.url);
                    toast({ title: "Copied to clipboard!", description: "Sharing isn't allowed, so we've copied the text for you." });
                } catch(copyError) {
                    console.error('Fallback clipboard copy failed:', copyError);
                    toast({ variant: 'destructive', title: "Couldn't Share or Copy", description: 'Please try again.' });
                }
            } else if (error.name !== 'AbortError') {
                console.error('Error sharing:', error);
                toast({ variant: 'destructive', title: "Couldn't share", description: 'Something went wrong.' });
            }
        }
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
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                </div>
            }

            {!isLoading && !isCalculating && scoreResult && (
                <div className="space-y-6">
                    <Card>
                        <CardContent className="relative p-6 flex flex-col items-center justify-center text-center">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button onClick={handleShare} className="absolute top-4 right-4" variant="outline" size="icon">
                                            <Share2 className="h-4 w-4" />
                                            <span className="sr-only">Share Score</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Share your score</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <ScoreGauge score={scoreResult.score} color={getScoreHslColor(scoreResult.score)} />
                            <h2 className="text-2xl font-bold font-headline mt-4">{getScoreTitle(scoreResult.score)}</h2>
                            <p className="text-muted-foreground max-w-xs">{getScoreDescription(scoreResult.score)}</p>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    Savings Ratio
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{(scoreResult.savingsRatio * 100).toFixed(1)}%</div>
                                <p className="text-xs text-muted-foreground">
                                    Of income saved in the last 6 months.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Progress value={scoreResult.savingsRatio * 100} className="h-2" />
                            </CardFooter>
                        </Card>
                         <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Target className="h-4 w-4 text-muted-foreground" />
                                    Expense Discipline
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{scoreResult.disciplineRatio !== null ? `${(scoreResult.disciplineRatio * 100).toFixed(0)}%` : 'N/A'}</div>
                                 <p className="text-xs text-muted-foreground">
                                    Of completed budgets met.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Progress value={scoreResult.disciplineRatio !== null ? scoreResult.disciplineRatio * 100 : 0} className="h-2" />
                            </CardFooter>
                        </Card>
                         <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Repeat className="h-4 w-4 text-muted-foreground" />
                                    Income Consistency
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{Math.round(scoreResult.consistencyRatio * 100)}%</div>
                                <p className="text-xs text-muted-foreground">
                                    {`Income in ${Math.round(scoreResult.consistencyRatio * 6)} of the last 6 months.`}
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Progress value={scoreResult.consistencyRatio * 100} className="h-2" />
                            </CardFooter>
                        </Card>
                         <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Trophy className="h-4 w-4 text-muted-foreground" />
                                    Goal Achievement
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{scoreResult.goalAchievementRatio !== null ? `${(scoreResult.goalAchievementRatio * 100).toFixed(0)}%` : 'N/A'}</div>
                                 <p className="text-xs text-muted-foreground">
                                    Average progress on your savings goals.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Progress value={scoreResult.goalAchievementRatio !== null ? scoreResult.goalAchievementRatio * 100 : 0} className="h-2" />
                            </CardFooter>
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
