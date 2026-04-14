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
    
    const personalIncome = useMemo(() => income?.filter(i => i.context !== 'business') || [], [income]);
    const personalExpenses = useMemo(() => expenses?.filter(e => e.context !== 'business') || [], [expenses]);

    useEffect(() => {
        if (!isLoading && personalIncome && personalExpenses && budgets && savingsGoals) {
            setIsCalculating(true);
            const result = calculateKontrolaScore(personalIncome, personalExpenses, budgets, savingsGoals);
            setScoreResult(result);
            setIsCalculating(false);
        } else if (!isLoading) {
            setIsCalculating(false);
        }
    }, [isLoading, personalIncome, personalExpenses, budgets, savingsGoals]);

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
        <Card className="h-full group hover:border-primary/50 hover:bg-primary/[0.01] hover:scale-[1.015] transition-all duration-500 shadow-premium glass-card overflow-hidden relative border-border/20">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:rotate-12 duration-700">
                <Activity className="h-20 sm:h-24 w-20 sm:w-24 text-primary" />
            </div>
            <CardHeader className="pb-0 flex flex-row items-center justify-between space-y-0 relative z-10 px-4 sm:px-6 pt-5 sm:pt-6">
                <div className="space-y-0.5 sm:space-y-1">
                    <CardTitle className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-primary/60 flex items-center gap-2">
                         <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                         Kontrola Score
                    </CardTitle>
                    <CardDescription className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tight text-muted-foreground/30 mt-0.5 italic">Proprietary Health Index</CardDescription>
                </div>
                <Link href="/dashboard/score" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="pt-2 sm:pt-6 flex flex-col items-center relative z-10 px-3 sm:px-6 pb-6 sm:pb-8">
                {/* Horizontal Layout for Mobile for better vertical conservation */}
                <div className="flex flex-row items-center justify-center gap-3 sm:gap-8 w-full max-w-full overflow-hidden">
                    <div className="relative h-20 w-20 min-[375px]:h-28 min-[375px]:w-28 sm:h-32 sm:w-32 group-hover:scale-105 transition-transform duration-700 shrink-0">
                         <ChartContainer config={{}} className="h-full w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <defs>
                                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={scoreColor} stopOpacity={1} />
                                            <stop offset="100%" stopColor={scoreColor} stopOpacity={0.4} />
                                        </linearGradient>
                                    </defs>
                                    <Pie
                                        data={chartData}
                                        dataKey="value"
                                        startAngle={225}
                                        endAngle={-45}
                                        innerRadius="80%"
                                        outerRadius="100%"
                                        stroke="none"
                                        paddingAngle={0}
                                        cy="50%"
                                    >
                                        <Cell fill="url(#scoreGradient)" className="drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)] transition-all duration-1000" />
                                        <Cell fill="hsl(var(--muted)/0.15)" stroke="white" strokeWidth={0.5} strokeOpacity={0.05} />
                                        <Label
                                            content={({ viewBox }) => {
                                                const v = viewBox as { cx: number, cy: number };
                                                if (v && v.cx !== undefined && v.cy !== undefined) {
                                                    return (
                                                        <g>
                                                            <text x={v.cx} y={v.cy} textAnchor="middle" dominantBaseline="middle">
                                                                <tspan x={v.cx} y={v.cy} className="text-xl sm:text-3xl font-black tracking-tighter" style={{ fill: scoreColor }}>
                                                                    {scoreResult.score}
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

                    <div className="flex-1 min-w-0">
                        <p className="text-lg sm:text-2xl font-black tracking-tighter truncate leading-none mb-1" style={{ color: scoreColor }}>
                            {getScoreTitle(scoreResult.score)}
                        </p>
                        <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10 w-fit overflow-hidden">
                             <ShieldCheck className="h-3 w-3 text-primary shrink-0" />
                             <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-tight truncate opacity-70">Status: {scoreResult.savingsRatio > 0.1 ? 'Resilient' : 'Vulnerable'}</span>
                        </div>
                    </div>
                </div>
                
                <div className="w-full mt-4 sm:mt-8 space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                             <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">Maturity Progress</p>
                             <p className="text-[11px] sm:text-xs font-black tracking-tight">{scoreResult.goalAchievementRatio !== null ? `${(scoreResult.goalAchievementRatio * 100).toFixed(0)}%` : '0%'} Secured</p>
                        </div>
                        <Target className="h-3.5 w-3.5 text-primary/40" />
                    </div>
                    <div className="relative h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-muted/10 border border-white/5 shadow-inner">
                        <div 
                            className="absolute h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)]"
                            style={{ width: `${scoreResult.goalAchievementRatio !== null ? scoreResult.goalAchievementRatio * 100 : 0}%` }}
                        />
                        {/* Glass glow */}
                        <div 
                           className="absolute top-0 left-0 h-full w-full bg-primary/20 opacity-30 blur-sm pointer-events-none"
                           style={{ transform: `translateX(${(scoreResult.goalAchievementRatio || 0) * 100 - 100}%)` }}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
