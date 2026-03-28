'use client';

import * as React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, cn } from "@/lib/utils";
import type { Expense } from "@/lib/types";
import { 
  Activity, 
  ArrowUpRight, 
  TrendingUp, 
  Sparkles, 
  Flame, 
  Wallet,
  ShieldCheck,
  Zap
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CategoryIntelligenceProps {
  expenses: Expense[] | null;
  isLoading: boolean;
  currency: string;
}

export function CategoryIntelligence({ expenses, isLoading, currency }: CategoryIntelligenceProps) {
  
  const analysis = React.useMemo(() => {
    if (!expenses || expenses.length === 0) return null;

    const totalOutflow = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    const categoryMap = expenses.reduce((acc, expense) => {
      const cat = expense.category || 'Other';
      if (!acc[cat]) {
        acc[cat] = { name: cat, total: 0, count: 0 };
      }
      acc[cat].total += expense.amount;
      acc[cat].count += 1;
      return acc;
    }, {} as Record<string, { name: string; total: number; count: number }>);

    const sorted = Object.values(categoryMap)
      .sort((a, b) => b.total - a.total)
      .map(item => ({
        ...item,
        percentage: (item.total / totalOutflow) * 100
      }));

    return {
      categories: sorted,
      totalOutflow,
      leadCategory: sorted[0]
    };
  }, [expenses]);

  if (isLoading) {
    return (
      <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
        <CardHeader>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="glass-card shadow-premium border-border/40 overflow-hidden opacity-60">
        <CardHeader className="text-center py-12">
          <Activity className="mx-auto h-12 w-12 text-muted-foreground/20 mb-4" />
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground/40">No Analytics Available</CardTitle>
          <CardDescription className="text-[10px] uppercase tracking-tighter">Enter expenses to activate intelligence layers</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="glass-card shadow-premium border-border/40 overflow-hidden relative group">
      {/* Background Glow */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />
      
      <CardHeader className="relative z-10 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-primary" />
            Category Velocity
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80">Active Analysis</span>
          </div>
        </div>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">Precision outflow distribution across all data sectors</CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-7 pt-4">
        {analysis.categories.map((cat, index) => {
          const isLead = index === 0;
          return (
            <div key={cat.name} className="space-y-2.5 group/item cursor-default">
              <div className="flex items-end justify-between">
                <div className="flex flex-col">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors duration-300",
                    isLead ? "text-amber-500" : "text-muted-foreground/70 group-hover/item:text-foreground"
                  )}>
                    {isLead ? <Flame className="h-3 w-3 animate-bounce" /> : <Zap className="h-2.5 w-2.5 opacity-30" />}
                    {cat.name}
                    {isLead && (
                      <span className="ml-1 text-[8px] px-1 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">Lead Outflow</span>
                    )}
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground/40 mt-0.5">{cat.count} Operations Logged</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-black tracking-tighter text-foreground tabular-nums">
                    {formatCurrency(cat.total, currency)}
                  </span>
                  <span className={cn(
                    "text-[9px] font-black tracking-widest uppercase",
                    isLead ? "text-amber-600/60" : "text-muted-foreground/30"
                  )}>
                    {cat.percentage.toFixed(1)}% Spectrum
                  </span>
                </div>
              </div>
              
              <div className="relative pt-1">
                <Progress 
                  value={cat.percentage} 
                  className={cn(
                    "h-[3px] transition-all duration-1000",
                    isLead ? "bg-amber-500/10" : "bg-muted/10"
                  )} 
                />
                {/* Custom Indicator Color Logic */}
                <div 
                  className={cn(
                    "absolute top-1 left-0 h-[3px] rounded-full transition-all duration-1000 ease-out",
                    isLead ? "bg-gradient-to-r from-amber-400 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.4)]" : 
                    cat.percentage > 40 ? "bg-primary" : "bg-primary/40"
                  )}
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Intelligence Insight */}
        {analysis.leadCategory && analysis.leadCategory.percentage > 50 && (
          <div className="mt-8 p-4 rounded-xl bg-amber-500/[0.03] border border-amber-500/10 flex items-start gap-3">
            <div className="mt-0.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/80 italic">Precision Insight</p>
              <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                Critical resource concentration in <span className="font-bold text-foreground italic">{analysis.leadCategory.name}</span>. It accounts for <span className="font-bold text-foreground">{analysis.leadCategory.percentage.toFixed(1)}%</span> of your total capital outflow for this period.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
