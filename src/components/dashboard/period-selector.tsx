'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
    CalendarDays, 
    CreditCard, 
    Calendar as CalendarIcon,
    ChevronDown
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { PeriodMode, usePeriod } from '@/components/period-provider';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';

interface PeriodSelectorProps {
    periodMode: PeriodMode;
    onModeChange: (mode: PeriodMode) => void;
    incomeDate?: number;
    label: string;
    customRange: DateRange | undefined;
    onCustomRangeChange: (range: DateRange | undefined) => void;
    onDiscovered?: () => void;
}

export function PeriodSelector({
    periodMode,
    onModeChange,
    incomeDate,
    label,
    customRange,
    onCustomRangeChange,
    onDiscovered
}: PeriodSelectorProps) {
    const handleModeChange = (mode: PeriodMode) => {
        onModeChange(mode);
        if (mode === 'incomeCycle' && onDiscovered) {
            onDiscovered();
        }
    };

    const { shiftMonths } = usePeriod();

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/30 border border-border/20 rounded-lg p-0.5">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-md hover:bg-background/80 transition-all active:scale-90"
                    onClick={() => shiftMonths(-1)}
                >
                    <ChevronDown className="h-4 w-4 rotate-90 opacity-60" />
                </Button>
                <div className="px-2 min-w-[110px] text-center">
                     <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/80">
                        {label}
                    </span>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-md hover:bg-background/80 transition-all active:scale-90"
                    onClick={() => shiftMonths(1)}
                >
                    <ChevronDown className="h-4 w-4 -rotate-90 opacity-60" />
                </Button>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 glass-card shadow-soft border-border/40 font-bold uppercase tracking-widest text-[10px]">
                        {periodMode === 'monthly' && <CalendarDays className="h-3.5 w-3.5 text-primary" />}
                        {periodMode === 'incomeCycle' && <CreditCard className="h-3.5 w-3.5 text-primary" />}
                        {periodMode === 'custom' && <CalendarIcon className="h-3.5 w-3.5 text-primary" />}
                        <span className="hidden xs:inline">
                            {periodMode === 'monthly' ? 'Calendar Month' : 
                             periodMode === 'incomeCycle' ? 'Pay Cycle' : 'Custom Range'}
                        </span>
                        <span className="xs:hidden">
                             {periodMode === 'monthly' ? 'Monthly' : 
                             periodMode === 'incomeCycle' ? 'Pay Cycle' : 'Custom'}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-card border-border/40 shadow-premium">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuItem 
                                    onClick={() => handleModeChange('monthly')}
                                    className={cn("gap-2 font-bold text-[10px] uppercase tracking-widest", periodMode === 'monthly' && "bg-primary/10 text-primary")}
                                >
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    Calendar Month
                                </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="glass-card text-[10px] font-bold uppercase tracking-widest">
                                Standard view from the 1st to the end of the month.
                            </TooltipContent>
                        </Tooltip>

                        {incomeDate ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuItem 
                                        onClick={() => handleModeChange('incomeCycle')}
                                        className={cn("gap-2 font-bold text-[10px] uppercase tracking-widest", periodMode === 'incomeCycle' && "bg-primary/10 text-primary")}
                                    >
                                        <CreditCard className="h-3.5 w-3.5" />
                                        Pay Cycle ({incomeDate})
                                    </DropdownMenuItem>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="glass-card text-[10px] font-bold uppercase tracking-widest">
                                    Analyze cash flow from one payday to the next.
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <DropdownMenuItem 
                                disabled
                                className="gap-2 font-bold text-[10px] uppercase tracking-widest opacity-50"
                            >
                                <CreditCard className="h-3.5 w-3.5" />
                                Pay Cycle (Set in Settings)
                            </DropdownMenuItem>
                        )}

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuItem 
                                    onClick={() => handleModeChange('custom')}
                                    className={cn("gap-2 font-bold text-[10px] uppercase tracking-widest", periodMode === 'custom' && "bg-primary/10 text-primary")}
                                >
                                    <CalendarIcon className="h-3.5 w-3.5" />
                                    Custom Range
                                </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="glass-card text-[10px] font-bold uppercase tracking-widest">
                                Pick any specific date range for localized analysis.
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </DropdownMenuContent>
            </DropdownMenu>

            {periodMode === 'custom' && (
                <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                    <DateRangePicker 
                        date={customRange}
                        onDateChange={onCustomRangeChange}
                        className="h-9"
                    />
                </div>
            )}
        </div>
    );
}
