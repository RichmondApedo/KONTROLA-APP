'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { getIncomeCycleRange } from '@/lib/income-cycle-utils';
import { useUserProfile, useUser } from '@/firebase';
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
    const { user } = useUser();
    const { activeProfileId, profile, activeProfile } = useUserProfile();
    
    // Determine context: Personal if activeProfileId matches user.uid or is not set
    const isBusinessContext = activeProfileId && user && activeProfileId !== user.uid;
    const contextPrefix = isBusinessContext ? 'business' : 'personal';

    // For date calculations, always prefer the personal profile's incomeDate if available
    const incomeProfile = profile || activeProfile;

    // Load helper function
    const getSavedValue = (key: string, defaultValue: any) => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(key);
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    return saved;
                }
            }
        }
        return defaultValue;
    };

    // States for Personal
    const [personalMode, setPersonalModeState] = useState<PeriodMode>(() => getSavedValue('kontrola_personal_period_mode', 'monthly'));
    const [personalRange, setPersonalRangeState] = useState<DateRange | undefined>(() => {
        const saved = getSavedValue('kontrola_personal_custom_range', null);
        if (saved) return { from: new Date(saved.from), to: saved.to ? new Date(saved.to) : undefined };
        return undefined;
    });

    // States for Business
    const [businessMode, setBusinessModeState] = useState<PeriodMode>(() => getSavedValue('kontrola_business_period_mode', 'monthly'));
    const [businessRange, setBusinessRangeState] = useState<DateRange | undefined>(() => {
        const saved = getSavedValue('kontrola_business_custom_range', null);
        if (saved) return { from: new Date(saved.from), to: saved.to ? new Date(saved.to) : undefined };
        return undefined;
    });

    // Current active state based on context
    const periodMode = isBusinessContext ? businessMode : personalMode;
    const customRange = isBusinessContext ? businessRange : personalRange;

    const setPeriodMode = (mode: PeriodMode) => {
        if (isBusinessContext) {
            setBusinessModeState(mode);
            if (typeof window !== 'undefined') localStorage.setItem('kontrola_business_period_mode', mode);
        } else {
            setPersonalModeState(mode);
            if (typeof window !== 'undefined') localStorage.setItem('kontrola_personal_period_mode', mode);
        }
    };

    const setCustomRange = (range: DateRange | undefined) => {
        if (isBusinessContext) {
            setBusinessRangeState(range);
            if (typeof window !== 'undefined') {
                if (range) localStorage.setItem('kontrola_business_custom_range', JSON.stringify(range));
                else localStorage.removeItem('kontrola_business_custom_range');
            }
        } else {
            setPersonalRangeState(range);
            if (typeof window !== 'undefined') {
                if (range) localStorage.setItem('kontrola_personal_custom_range', JSON.stringify(range));
                else localStorage.removeItem('kontrola_personal_custom_range');
            }
        }
    };

    const result = useMemo(() => {
        const now = new Date();
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
    }), [periodMode, result, customRange, isBusinessContext]); // Added isBusinessContext to ensure re-render on switch

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
