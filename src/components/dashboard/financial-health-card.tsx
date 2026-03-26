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
        <Card className="h-full group hover:border-primary/50 transition-all duration-300 shadow-premium glass-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity className="h-20 w-20 text-primary rotate-12" />
            </div>
            <CardHeader className="pb-0 flex flex-row items-center justify-between space-y-0 relative z-10">
                <div className="space-y-1">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                         <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                         Kontrola Score
                    </CardTitle>
                    <CardDescription className="text-[10px] uppercase tracking-wider font-semibold opacity-70">Proprietary Health Index</CardDescription>
                </div>
                <Link href="/dashboard/score">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-background/40 hover:bg-primary/20 transition-colors">
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col items-center relative z-10">
                <div className="relative h-28 w-28 group-hover:scale-105 transition-transform duration-500">
                     <ChartContainer config={{}} className="h-full w-full">
                        <ResponsiveContainer>
                            <PieChart>
                                <defs>
                                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={scoreColor} stopOpacity={1} />
                                        <stop offset="100%" stopColor={scoreColor} stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    startAngle={225}
                                    endAngle={-45}
                                    innerRadius="78%"
                                    outerRadius="100%"
                                    stroke="none"
                                    paddingAngle={0}
                                    cy="50%"
                                >
                                    <Cell fill="url(#scoreGradient)" />
                                    <Cell fill="hsl(var(--muted)/0.3)" />
                                    <Label
                                        content={({ viewBox }) => {
                                            const v = viewBox as { cx: number, cy: number };
                                            if (v && v.cx !== undefined && v.cy !== undefined) {
                                                return (
                                                    <g>
                                                        <text x={v.cx} y={v.cy} textAnchor="middle" dominantBaseline="middle">
                                                            <tspan x={v.cx} y={v.cy} className="text-2xl font-black tracking-tighter" style={{ fill: scoreColor }}>
                                                                {scoreResult.score}
                                                            </tspan>
                                                        </text>
                                                        <text x={v.cx} y={v.cy + 12} textAnchor="middle" dominantBaseline="middle">
                                                            <tspan x={v.cx} y={v.cy + 15} className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                                                                PTS
                                                            </tspan>
                                                        </text>
                                                    </g>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
                
                <div className="text-center mt-3">
                    <p className="text-base font-black tracking-tight" style={{ color: scoreColor }}>
                        {getScoreTitle(scoreResult.score)}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 mt-1 px-3 py-1 rounded-full bg-background/40 border border-border/40">
                         <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                         <span className="text-[10px] font-bold uppercase tracking-tight">Status: {scoreResult.savingsRatio > 0.1 ? 'Resilient' : 'Vulnerable'}</span>
                    </div>
                </div>

                <div className="w-full mt-6 space-y-2">
                    <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                             <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Milestone Progress</p>
                             <p className="text-xs font-bold">{scoreResult.goalAchievementRatio !== null ? `${(scoreResult.goalAchievementRatio * 100).toFixed(0)}%` : '0%'} to Goals</p>
                        </div>
                        <Target className="h-4 w-4 text-primary/60" />
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/40">
                        <div 
                            className="absolute h-full bg-primary transition-all duration-1000 ease-out"
                            style={{ width: `${scoreResult.goalAchievementRatio !== null ? scoreResult.goalAchievementRatio * 100 : 0}%` }}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
