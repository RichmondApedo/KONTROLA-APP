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

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 sm:pb-4 relative z-10 px-5 sm:px-6 pt-5 sm:pt-6">
                <div className="space-y-1">
                    <CardTitle className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] text-emerald-600/60 flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-emerald-500 animate-pulse" />
                        Surplus Engine
                    </CardTitle>
                </div>
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-premium">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
            </CardHeader>

            <CardContent className="space-y-4 sm:space-y-6 relative z-10 px-5 sm:px-6 pb-6 sm:pb-8">
                <div className="space-y-1.5">
                    <div className="flex items-baseline gap-2 flex-wrap overflow-hidden">
                        <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-emerald-600 truncate leading-none">
                            {formatCurrency(insight.safeAmount, currency)}
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-emerald-600/40 translate-y-[-2px] shrink-0">Safe to Commit</span>
                    </div>
                    <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground/70 leading-relaxed break-words mt-2 max-w-[90%]">
                        {insight.reasoning}
                    </p>
                </div>

                {insight.upcomingObligation && (
                    <div className="p-3 sm:p-4 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10 flex items-center gap-3 sm:gap-4 group/item hover:bg-emerald-500/[0.06] transition-colors">
                        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 shadow-inner">
                            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600/60" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 mb-0.5">Automated Protection</p>
                            <p className="text-xs sm:text-sm font-bold truncate text-foreground/80">
                                {insight.upcomingObligation.name} — {formatCurrency(insight.upcomingObligation.amount, currency)}
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-emerald-500/10">
                    <div className="flex items-center gap-2.5">
                        <div className="flex -space-x-1.5 shrink-0">
                           {[1,2,3].map(i => (
                               <div key={i} className="h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-background bg-emerald-500/20 shadow-sm" />
                           ))}
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600/50">
                           {insight.confidence}% Confidence
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-auto">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-700">
                                        <Info className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[240px] text-[11px] font-bold p-4 glass-card shadow-2xl border-emerald-500/20">
                                    Our engine analyzed your historical burn rate and upcoming obligations to verify this surplus safely.
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
                            <Button size="sm" className="h-8 sm:h-9 px-4 sm:px-5 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-[0_8px_16px_rgba(16,185,129,0.25)] rounded-2xl active:scale-95 transition-all">
                                Commit
                            </Button>
                        </AddGoalDialog>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
