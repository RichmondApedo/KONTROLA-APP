'use client';

import { useState, useMemo, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { getIncomeCycleRange } from '@/lib/income-cycle-utils';
import type { UserProfile } from '@/lib/types';
import type { DateRange } from 'react-day-picker';

export type PeriodMode = 'monthly' | 'incomeCycle' | 'custom';

export interface UsePeriodModeResult {
    periodMode: PeriodMode;
    setPeriodMode: (mode: PeriodMode) => void;
    startDate: Date;
    endDate: Date;
    customRange: DateRange | undefined;
    setCustomRange: (range: DateRange | undefined) => void;
    label: string;
}

export function usePeriodMode(profile: UserProfile | null): UsePeriodModeResult {
    const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
    const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
    
    // Default to current month
    const now = new Date();
    
    const result = useMemo(() => {
        if (periodMode === 'custom' && customRange?.from) {
            const start = startOfDay(customRange.from);
            const end = endOfDay(customRange.to || customRange.from);
            return {
                startDate: start,
                endDate: end,
                label: 'Custom Range'
            };
        }

        if (periodMode === 'incomeCycle' && profile?.incomeDate) {
            return getIncomeCycleRange(profile.incomeDate, now);
        }

        // Default: monthly
        return {
            startDate: startOfMonth(now),
            endDate: endOfMonth(now),
            label: 'Monthly'
        };
    }, [periodMode, customRange, profile?.incomeDate]);

    return {
        periodMode,
        setPeriodMode,
        startDate: result.startDate,
        endDate: result.endDate,
        customRange,
        setCustomRange,
        label: result.label
    };
}
