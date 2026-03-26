'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import type { IncomeSource, Expense, Budget, SavingsGoal } from '@/lib/types';
import { subMonths, subYears } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ShieldCheck, Activity, Target, Loader2, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    calculateKontrolaScore, 
    getScoreHslColor, 
    getScoreTitle, 
    type ScoreResult 
} from '@/lib/score-utils';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';

export function FinancialHealthCard() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { profile } = useUserProfile();
    
    const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
    const [isCalculating, setIsCalculating] = useState(true);

    const sixMonthsAgo = useMemo(() => subMonths(new Date(), 6), []);
    const oneYearAgo = useMemo(() => subYears(new Date(), 1), []);

    const incomeQuery = useMemo(() => user && firestore ? query(
        collection(firestore, `users/${user.uid}/incomeSources`),
        where('date', '>=', Timestamp.fromDate(sixMonthsAgo))
    ) : null, [user, firestore, sixMonthsAgo]);

    const expensesQuery = useMemo(() => user && firestore ? query(
        collection(firestore, `users/${user.uid}/expenses`),
        where('date', '>=', Timestamp.fromDate(oneYearAgo))
    ) : null, [user, firestore, oneYearAgo]);
    
    const budgetsQuery = useMemo(() => user && firestore ? query(
        collection(firestore, `users/${user.uid}/budgets`),
        where('endDate', '<', new Date()),
        orderBy('endDate', 'desc'),
        limit(5)
    ) : null, [user, firestore]);

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

    if (isLoading || isCalculating) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center pt-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-6 w-1/3 mt-4" />
                </CardContent>
            </Card>
        );
    }

    if (!scoreResult) return null;

    const scoreColor = getScoreHslColor(scoreResult.score);
    const chartData = [
        { name: 'score', value: scoreResult.score, fill: scoreColor },
        { name: 'empty', value: 1000 - scoreResult.score, fill: 'hsl(var(--muted))' }
    ];

    return (
        <Card className="h-full group hover:border-primary/50 transition-colors">
            <CardHeader className="pb-0 flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                         <Activity className="h-4 w-4 text-primary" />
                         Financial Health
                    </CardTitle>
                    <CardDescription className="text-[10px]">Your proprietary safety score</CardDescription>
                </div>
                <Link href="/dashboard/score">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col items-center">
                <div className="relative h-24 w-24">
                     <ChartContainer config={{}} className="h-full w-full">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    startAngle={210}
                                    endAngle={-30}
                                    innerRadius="75%"
                                    outerRadius="100%"
                                    cornerRadius={99}
                                    cy="50%"
                                >
                                    {chartData.map((entry) => (
                                        <Cell key={`cell-${entry.name}`} fill={entry.fill} stroke={entry.fill} />
                                    ))}
                                    <Label
                                        content={({ viewBox }) => {
                                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                                return (
                                                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                                        <tspan x={viewBox.cx} y={viewBox.cy} className="text-xl font-bold" style={{ fill: scoreColor }}>
                                                            {scoreResult.score}
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
                </div>
                
                <div className="text-center mt-2">
                    <p className="text-sm font-bold" style={{ color: scoreColor }}>
                        {getScoreTitle(scoreResult.score)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                         <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                         <span className="text-[10px] text-muted-foreground">Safety: {scoreResult.savingsRatio > 0.1 ? 'Strong' : 'At Risk'}</span>
                    </div>
                </div>

                <div className="w-full mt-4 pt-4 border-t border-border/50">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-muted-foreground">Goal Progress</span>
                        <span className="text-[10px] font-medium">{scoreResult.goalAchievementRatio !== null ? `${(scoreResult.goalAchievementRatio * 100).toFixed(0)}%` : '0%'}</span>
                    </div>
                    <Progress value={scoreResult.goalAchievementRatio !== null ? scoreResult.goalAchievementRatio * 100 : 0} className="h-1" />
                </div>
            </CardContent>
        </Card>
    );
}
