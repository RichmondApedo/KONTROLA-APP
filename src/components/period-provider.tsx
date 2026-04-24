'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { getIncomeCycleRange } from '@/lib/income-cycle-utils';
import { useUserProfile } from '@/firebase';
import type { DateRange } from 'react-day-picker';

export type PeriodMode = 'monthly' | 'incomeCycle' | 'custom';

export interface PeriodContextType {
    periodMode: PeriodMode;
    setPeriodMode: (mode: PeriodMode) => void;
    startDate: Date;
    endDate: Date;
    customRange: DateRange | undefined;
    setCustomRange: (range: DateRange | undefined) => void;
    label: string;
}

export type UsePeriodModeResult = PeriodContextType;

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

export function PeriodProvider({ children }: { children: React.ReactNode }) {
    const { activeProfile, profile } = useUserProfile();
    // For date calculations, always prefer the personal profile's incomeDate if available
    const incomeProfile = profile || activeProfile;

    // Initialize from localStorage if available
    const [periodMode, setPeriodModeState] = useState<PeriodMode>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('kontrola_period_mode') as PeriodMode) || 'monthly';
        }
        return 'monthly';
    });

    const [customRange, setCustomRangeState] = useState<DateRange | undefined>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kontrola_custom_range');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    return {
                        from: parsed.from ? new Date(parsed.from) : undefined,
                        to: parsed.to ? new Date(parsed.to) : undefined
                    };
                } catch (e) {
                    return undefined;
                }
            }
        }
        return undefined;
    });

    const setPeriodMode = (mode: PeriodMode) => {
        setPeriodModeState(mode);
        if (typeof window !== 'undefined') {
            localStorage.setItem('kontrola_period_mode', mode);
        }
    };

    const setCustomRange = (range: DateRange | undefined) => {
        setCustomRangeState(range);
        if (typeof window !== 'undefined') {
            if (range) {
                localStorage.setItem('kontrola_custom_range', JSON.stringify(range));
            } else {
                localStorage.removeItem('kontrola_custom_range');
            }
        }
    };

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

        if (periodMode === 'incomeCycle' && incomeProfile?.incomeDate) {
            return getIncomeCycleRange(incomeProfile.incomeDate, now);
        }

        // Default: monthly
        return {
            startDate: startOfMonth(now),
            endDate: endOfMonth(now),
            label: 'Monthly'
        };
    }, [periodMode, customRange, incomeProfile?.incomeDate]);

    const value = useMemo(() => ({
        periodMode,
        setPeriodMode,
        startDate: result.startDate,
        endDate: result.endDate,
        customRange,
        setCustomRange,
        label: result.label
    }), [periodMode, result, customRange]);

    return (
        <PeriodContext.Provider value={value}>
            {children}
        </PeriodContext.Provider>
    );
}

export function usePeriod() {
    const context = useContext(PeriodContext);
    if (context === undefined) {
        throw new Error('usePeriod must be used within a PeriodProvider');
    }
    return context;
}
