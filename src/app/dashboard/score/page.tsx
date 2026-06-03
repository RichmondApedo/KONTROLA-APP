'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import type { IncomeSource, Expense, Budget, SavingsGoal } from '@/lib/types';
import { getMonth, getYear, subMonths, subYears } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, TrendingUp, Target, Repeat, Trophy, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Label, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
    calculateKontrolaScore, 
    getScoreHslColor, 
    getScoreTitle, 
    getScoreDescription,
    type ScoreResult 
} from '@/lib/score-utils';
import { cn } from '@/lib/utils';
import Link from 'next/link';


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
    const { profile, activeProfileId } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();

    const isDelegate = activeProfileId && user && activeProfileId !== user.uid;

    const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
    const [isCalculating, setIsCalculating] = useState(true);

    // --- Data Fetching ---
    const sixMonthsAgo = useMemo(() => subMonths(new Date(), 6), []);
    const oneYearAgo = useMemo(() => subYears(new Date(), 1), []);

    const incomeQuery = useMemo(() => !isDelegate && user && firestore ? query(
        collection(firestore, `users/${user.uid}/incomeSources`),
        where('date', '>=', Timestamp.fromDate(sixMonthsAgo))
    ) : null, [isDelegate, user, firestore, sixMonthsAgo]);

    const expensesQuery = useMemo(() => !isDelegate && user && firestore ? query(
        collection(firestore, `users/${user.uid}/expenses`),
        where('date', '>=', Timestamp.fromDate(oneYearAgo))
    ) : null, [isDelegate, user, firestore, oneYearAgo]);
    
    const budgetsQuery = useMemo(() => !isDelegate && user && firestore ? query(
        collection(firestore, `users/${user.uid}/budgets`),
        where('endDate', '<', new Date())
    ) : null, [isDelegate, user, firestore]);

    const savingsGoalsQuery = useMemo(() => !isDelegate && user && firestore ? query(collection(firestore, `users/${user.uid}/savingsGoals`)) : null, [isDelegate, user, firestore]);

    const { data: income, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);
    const { data: savingsGoals, isLoading: goalsLoading } = useCollection<SavingsGoal>(savingsGoalsQuery);

    const isLoading = incomeLoading || expensesLoading || budgetsLoading || goalsLoading;
    
    useEffect(() => {
        if (isDelegate) {
            setIsCalculating(false);
            return;
        }
        if (!isLoading && income && expenses && budgets && savingsGoals) {
            setIsCalculating(true);
            const result = calculateKontrolaScore(income, expenses, budgets, savingsGoals);
            setScoreResult(result);
            setIsCalculating(false);
        } else if (!isLoading) {
            setIsCalculating(false);
        }
    }, [isDelegate, isLoading, income, expenses, budgets, savingsGoals]);

    if (isDelegate) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="h-24 w-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center shadow-inner border border-emerald-500/20">
                    <Lock className="h-12 w-12 text-emerald-500" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-black font-headline tracking-tight text-primary">Privacy Shield Active</h1>
                    <p className="text-muted-foreground font-medium max-w-md mx-auto">
                        You are currently in a delegated business session. Personal financial vitality scores and habit metrics are restricted to the account owner.
                    </p>
                </div>
                <Button asChild variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-[10px] border-primary/20 bg-primary/5 hover:bg-primary/10">
                    <Link href="/dashboard/business">Return to Business Suite</Link>
                </Button>
            </div>
        );
    }


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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* --- EXPERT HEADER SECTION --- */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pt-4 pb-8 border-b border-border/10 relative min-h-[160px] xl:min-h-[140px]">
                <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Vitality Index Active</span>
                    </div>
                    <h1 className="text-[clamp(1.75rem,7vw,4.5rem)] font-black font-headline tracking-tighter text-foreground leading-[0.85] sm:leading-[0.9]">
                        Kontrola Score
                    </h1>
                    <p className="text-muted-foreground text-xs sm:text-sm font-bold uppercase tracking-widest opacity-60">
                        Financial Health • <span className="text-primary">Real-Time Performance</span>
                    </p>
                </div>
            </div>
            
            {(isLoading || isCalculating) && 
                <div className="space-y-8">
                    <Skeleton className="h-80 w-full rounded-2xl" />
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Skeleton className="h-44 w-full rounded-2xl" />
                        <Skeleton className="h-44 w-full rounded-2xl" />
                        <Skeleton className="h-44 w-full rounded-2xl" />
                        <Skeleton className="h-44 w-full rounded-2xl" />
                    </div>
                </div>
            }

            {!isLoading && !isCalculating && scoreResult && (
                <div className="space-y-8">
                    <Card className="glass-card shadow-premium border-border/40 overflow-hidden relative">
                        <CardContent className="relative p-12 flex flex-col items-center justify-center text-center z-10">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button onClick={handleShare} className="absolute top-6 right-6 h-10 w-10 rounded-full shadow-lg shadow-primary/20" variant="outline" size="icon">
                                            <Share2 className="h-4 w-4" />
                                            <span className="sr-only">Share Score</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="glass-card">
                                        <p className="text-[10px] font-black uppercase tracking-widest px-2">Broadcast Success</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full group-hover:bg-primary/30 transition-all duration-700" />
                                <ScoreGauge score={scoreResult.score} color={getScoreHslColor(scoreResult.score)} />
                            </div>
                            <h2 className="text-4xl font-black font-headline tracking-tighter mt-8 text-foreground uppercase">{getScoreTitle(scoreResult.score)}</h2>
                            <p className="text-muted-foreground max-w-sm mt-2 text-lg font-medium leading-tight">{getScoreDescription(scoreResult.score)}</p>
                            
                            <div className="mt-8 flex items-center gap-2">
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-black uppercase tracking-widest px-3 py-1">SOLVENT</Badge>
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest px-3 py-1">GROWTH ORIENTED</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="glass-card shadow-premium border-border/40 group hover:border-emerald-500/30 transition-all duration-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 flex items-center gap-2">
                                    <TrendingUp className="h-3 w-3" />
                                    Savings Rate
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black tracking-tighter text-foreground group-hover:text-emerald-500 transition-colors">{(scoreResult.savingsRatio * 100).toFixed(1)}%</div>
                                <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground mt-1">
                                    Percentage of income saved
                                </p>
                            </CardContent>
                            <CardFooter className="pt-2">
                                <Progress value={scoreResult.savingsRatio * 100} className="h-1 bg-muted/30 [&>div]:bg-emerald-500" />
                            </CardFooter>
                        </Card>
                         <Card className="glass-card shadow-premium border-border/40 group hover:border-primary/30 transition-all duration-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 flex items-center gap-2">
                                    <Target className="h-3 w-3" />
                                    Budget Discipline
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">{scoreResult.disciplineRatio !== null ? `${(scoreResult.disciplineRatio * 100).toFixed(0)}%` : 'N/A'}</div>
                                 <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground mt-1">
                                    How closely you follow budgets
                                </p>
                            </CardContent>
                            <CardFooter className="pt-2">
                                <Progress value={scoreResult.disciplineRatio !== null ? scoreResult.disciplineRatio * 100 : 0} className="h-1 bg-muted/30 [&>div]:bg-primary" />
                            </CardFooter>
                        </Card>
                         <Card className="glass-card shadow-premium border-border/40 group hover:border-primary/30 transition-all duration-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 flex items-center gap-2">
                                    <Repeat className="h-3 w-3" />
                                    Income Consistency
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">{Math.round(scoreResult.consistencyRatio * 100)}%</div>
                                <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground mt-1">
                                    {`Consistency of incoming money`}
                                </p>
                            </CardContent>
                            <CardFooter className="pt-2">
                                <Progress value={scoreResult.consistencyRatio * 100} className="h-1 bg-muted/30 [&>div]:bg-primary" />
                            </CardFooter>
                        </Card>
                         <Card className="glass-card shadow-premium border-border/40 group hover:border-emerald-500/30 transition-all duration-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 flex items-center gap-2">
                                    <Trophy className="h-3 w-3" />
                                    Goal Progress
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black tracking-tighter text-foreground group-hover:text-emerald-500 transition-colors">{scoreResult.goalAchievementRatio !== null ? `${(scoreResult.goalAchievementRatio * 100).toFixed(0)}%` : 'N/A'}</div>
                                 <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground mt-1">
                                    Progress towards your savings goals
                                </p>
                            </CardContent>
                            <CardFooter className="pt-2">
                                <Progress value={scoreResult.goalAchievementRatio !== null ? scoreResult.goalAchievementRatio * 100 : 0} className="h-1 bg-muted/30 [&>div]:bg-emerald-500" />
                            </CardFooter>
                        </Card>
                    </div>

                    <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Vitality Pillar Breakdown</CardTitle>
                            <CardDescription className="text-xs uppercase tracking-tight opacity-70">Analysis of the metrics driving your score</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={[
                                        { name: 'Savings', value: scoreResult.savingsRatio * 100 },
                                        { name: 'Discipline', value: (scoreResult.disciplineRatio || 0) * 100 },
                                        { name: 'Consistency', value: scoreResult.consistencyRatio * 100 },
                                        { name: 'Goals', value: (scoreResult.goalAchievementRatio || 0) * 100 },
                                    ]}
                                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} 
                                    />
                                    <YAxis hide domain={[0, 100]} />
                                    <RechartsTooltip 
                                        cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="glass-card p-3 border-primary/20 shadow-xl">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">{payload[0].payload.name}</p>
                                                        <p className="text-xl font-black tracking-tighter">{Number(payload[0].value || 0).toFixed(0)}%</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar 
                                        dataKey="value" 
                                        fill="hsl(var(--primary))"
                                        radius={[8, 8, 0, 0]} 
                                        barSize={40}
                                        animationDuration={1500}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}
            
             {!isLoading && !isCalculating && !scoreResult && (
                <Card className="glass-card shadow-premium border-border/40">
                    <CardContent className="text-center text-muted-foreground py-24 flex flex-col items-center gap-6">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Trophy className="h-8 w-8 text-primary opacity-30" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-foreground tracking-tighter">Incomplete Financial Data Map</p>
                            <p className="text-sm mt-1">Add your income and expense events for at least one full cycle to generate your vitality index.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
