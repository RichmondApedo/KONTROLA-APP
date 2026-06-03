'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, preciseRound } from '@/lib/utils';
import { Zap, Calendar, TrendingUp } from 'lucide-react';
import type { Expense } from '@/lib/types';

export function ExpensePulse() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { activeProfileId } = useUserProfile();
    
    const targetUid = activeProfileId || user?.uid;

    // Stabilize reference dates to prevent infinite query re-fetching loops
    const todayStr = new Date().toDateString();
    const { todayStart, todayEnd, weekStart, weekEnd } = useMemo(() => {
        const d = new Date(todayStr);
        return { 
            todayStart: startOfDay(d), 
            todayEnd: endOfDay(d), 
            weekStart: startOfWeek(d, { weekStartsOn: 1 }), 
            weekEnd: endOfWeek(d, { weekStartsOn: 1 }) 
        };
    }, [todayStr]); // Only recalculate if the calendar day changes

    const dailyQuery = useMemo(() => targetUid && firestore ? query(
        collection(firestore, `users/${targetUid}/expenses`),
        where('date', '>=', Timestamp.fromDate(todayStart)),
        where('date', '<=', Timestamp.fromDate(todayEnd))
    ) : null, [targetUid, firestore, todayStart, todayEnd]);

    const weeklyQuery = useMemo(() => targetUid && firestore ? query(
        collection(firestore, `users/${targetUid}/expenses`),
        where('date', '>=', Timestamp.fromDate(weekStart)),
        where('date', '<=', Timestamp.fromDate(weekEnd))
    ) : null, [targetUid, firestore, weekStart, weekEnd]);

    const { data: dailyExpenses, isLoading: isDailyLoading } = useCollection<Expense>(dailyQuery);
    const { data: weeklyExpenses, isLoading: isWeeklyLoading } = useCollection<Expense>(weeklyQuery);
    
    const { profile } = useUserProfile();
    const currency = profile?.preferredCurrency || 'ghs';

    const dailyTotal = useMemo(() => {
        return preciseRound(dailyExpenses?.filter(e => e.context !== 'business').reduce((acc, e) => acc + (e.amount || 0), 0) || 0);
    }, [dailyExpenses]);

    const weeklyTotal = useMemo(() => {
        return preciseRound(weeklyExpenses?.filter(e => e.context !== 'business').reduce((acc, e) => acc + (e.amount || 0), 0) || 0);
    }, [weeklyExpenses]);

    if (isDailyLoading || isWeeklyLoading) {
        return (
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                <Skeleton className="h-[58px] w-32 shrink-0 rounded-2xl" />
                <Skeleton className="h-[58px] w-40 shrink-0 rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="flex flex-row items-center gap-3 w-full min-w-0 overflow-x-auto no-scrollbar py-1">
            {/* Daily Pulse */}
            <div className="flex items-center gap-3 bg-primary/[0.03] border border-primary/10 rounded-2xl px-4 py-3 min-w-[140px] group hover:bg-primary/[0.06] transition-all duration-300">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Today</span>
                    <span className="text-sm font-black tracking-tight text-foreground">
                        {formatCurrency(dailyTotal, currency)}
                    </span>
                </div>
            </div>

            {/* Weekly Pulse */}
            <div className="flex items-center gap-3 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl px-4 py-3 min-w-[160px] group hover:bg-emerald-500/[0.06] transition-all duration-300">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">This Week</span>
                    <span className="text-sm font-black tracking-tight text-foreground">
                        {formatCurrency(weeklyTotal, currency)}
                    </span>
                </div>
            </div>
        </div>
    );
}
