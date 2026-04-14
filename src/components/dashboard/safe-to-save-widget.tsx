'use client';

import { useSafeToSave } from '@/hooks/use-safe-to-save';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Info, ChevronRight, ShieldCheck, Activity } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useUserProfile } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AddGoalDialog } from './add-goal-dialog';

export function SafeToSaveWidget() {
    const { profile } = useUserProfile();
    const { insight, isLoading, error } = useSafeToSave();
    const currency = profile?.preferredCurrency || 'ghs';

    if (isLoading) {
        return (
            <Card className="glass-card shadow-premium border-border/40 overflow-hidden relative bg-emerald-500/[0.02]">
                <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </CardContent>
            </Card>
        );
    }

    if (error || !insight || insight.safeAmount <= 0) {
        return null; // Don't show anything if there's no safe amount found or an error
    }

    return (
        <Card className="glass-card shadow-premium border-emerald-500/20 overflow-hidden group hover:scale-[1.015] transition-all duration-500 relative bg-emerald-500/[0.03]">
            {/* Background Accent */}
            <div className="absolute -right-6 -top-6 p-10 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 duration-700">
                <ShieldCheck className="h-28 w-28 text-emerald-500" />
            </div>

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 relative z-10 px-4 sm:px-6">
                <div className="space-y-0.5 sm:space-y-1">
                    <CardTitle className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/80 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        Liquidity Analysis
                    </CardTitle>
                </div>
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
                </div>
            </CardHeader>

            <CardContent className="space-y-3 sm:space-y-4 relative z-10 px-4 sm:px-6 pb-5 sm:pb-6">
                <div className="space-y-0.5">
                    <div className="flex items-baseline gap-1 flex-wrap overflow-hidden">
                        <span className="text-xl xs:text-2xl sm:text-3xl font-black tracking-tighter text-emerald-600 truncate">
                            {formatCurrency(insight.safeAmount, currency)}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight text-emerald-600/40 translate-y-[-1px] sm:translate-y-[-2px] shrink-0">Available Surplus</span>
                    </div>
                    <p className="text-[10.5px] sm:text-xs font-medium text-muted-foreground leading-relaxed break-words opacity-80 mt-1">
                        {insight.reasoning}
                    </p>
                </div>

                {insight.upcomingObligation && (
                    <div className="p-2 sm:p-3 rounded-xl bg-background/40 border border-emerald-500/10 flex items-center gap-2 sm:gap-3">
                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500/70" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Next Protected Bill</p>
                            <p className="text-[11px] sm:text-xs font-bold truncate">
                                {insight.upcomingObligation.name} — {formatCurrency(insight.upcomingObligation.amount, currency)}
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-500/5">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="flex -space-x-1 shrink-0">
                           {[1,2,3].map(i => (
                               <div key={i} className="h-3 w-3 sm:h-4 sm:w-4 rounded-full border border-background bg-emerald-500/20" />
                           ))}
                        </div>
                        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tight text-muted-foreground/60">
                           {insight.confidence}% Neural Confidence
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-auto">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 sm:h-7 sm:w-7 p-0 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600">
                                        <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px] text-[10px] font-medium p-3 glass-card shadow-premium">
                                    This amount accounts for all your predicted bills plus a 15% safety buffer. Moving this to savings won't affect your daily liquidity.
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
 
                        <AddGoalDialog 
                            currency={currency} 
                            suggestion={{ 
                                name: 'Recommended Savings', 
                                targetAmount: insight.safeAmount 
                            }}
                        >
                            <Button size="sm" className="h-7 sm:h-8 px-2.5 sm:px-3 text-[8.5px] sm:text-[9px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-lg shadow-emerald-600/20 rounded-xl">
                                Commit
                            </Button>
                        </AddGoalDialog>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
