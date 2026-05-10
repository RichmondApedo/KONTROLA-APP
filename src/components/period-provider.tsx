'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format } from 'date-fns';
import { getIncomeCycleRange } from '@/lib/income-cycle-utils';
import { useUserProfile, useUser } from '@/firebase';
import type { DateRange } from 'react-day-picker';

export type PeriodMode = 'monthly' | 'incomeCycle' | 'custom';

export interface PeriodContextType {
    // Legacy support for active context
    periodMode: PeriodMode;
    setPeriodMode: (mode: PeriodMode) => void;
    startDate: Date;
    endDate: Date;
    customRange: DateRange | undefined;
    setCustomRange: (range: DateRange | undefined) => void;
    label: string;

    // Explicit Personal Settings
    personal: {
        periodMode: PeriodMode;
        setPeriodMode: (mode: PeriodMode) => void;
        customRange: DateRange | undefined;
        setCustomRange: (range: DateRange | undefined) => void;
        startDate: Date;
        endDate: Date;
        label: string;
    };

    // Explicit Business Settings
    business: {
        periodMode: PeriodMode;
        setPeriodMode: (mode: PeriodMode) => void;
        customRange: DateRange | undefined;
        setCustomRange: (range: DateRange | undefined) => void;
        startDate: Date;
        endDate: Date;
        label: string;
        baseDate: Date;
        shiftMonths: (delta: number) => void;
    };
    // Shorthand for active
    baseDate: Date;
    shiftMonths: (delta: number) => void;
}

export type UsePeriodModeResult = PeriodContextType;

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

export function PeriodProvider({ children }: { children: React.ReactNode }) {
    const { user } = useUser();
    const { activeProfileId, profile, activeProfile } = useUserProfile();
    
    const isBusinessContext = activeProfileId && user && activeProfileId !== user.uid;

    const incomeProfile = profile || activeProfile;

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

    // --- Personal State ---
    const [personalMode, setPersonalModeState] = useState<PeriodMode>(() => getSavedValue('kontrola_personal_period_mode', 'monthly'));
    const [personalRange, setPersonalRangeState] = useState<DateRange | undefined>(() => {
        const saved = getSavedValue('kontrola_personal_custom_range', null);
        if (saved) return { from: new Date(saved.from), to: saved.to ? new Date(saved.to) : undefined };
        return undefined;
    });

    const setPersonalMode = React.useCallback((mode: PeriodMode) => {
        setPersonalModeState(mode);
        if (typeof window !== 'undefined') localStorage.setItem('kontrola_personal_period_mode', mode);
    }, []);

    const setPersonalRange = React.useCallback((range: DateRange | undefined) => {
        setPersonalRangeState(range);
        if (typeof window !== 'undefined') {
            if (range) localStorage.setItem('kontrola_personal_custom_range', JSON.stringify(range));
            else localStorage.removeItem('kontrola_personal_custom_range');
        }
    }, []);

    // --- Business State ---
    const [businessMode, setBusinessModeState] = useState<PeriodMode>(() => getSavedValue('kontrola_business_period_mode', 'monthly'));
    const [businessRange, setBusinessRangeState] = useState<DateRange | undefined>(() => {
        const saved = getSavedValue('kontrola_business_custom_range', null);
        if (saved) return { from: new Date(saved.from), to: saved.to ? new Date(saved.to) : undefined };
        return undefined;
    });

    const [personalBaseDate, setPersonalBaseDate] = useState(new Date());
    const [businessBaseDate, setBusinessBaseDate] = useState(new Date());

    const setBusinessMode = React.useCallback((mode: PeriodMode) => {
        setBusinessModeState(mode);
        if (typeof window !== 'undefined') localStorage.setItem('kontrola_business_period_mode', mode);
    }, []);

    const setBusinessRange = React.useCallback((range: DateRange | undefined) => {
        setBusinessRangeState(range);
        if (typeof window !== 'undefined') {
            if (range) localStorage.setItem('kontrola_business_custom_range', JSON.stringify(range));
            else localStorage.removeItem('kontrola_business_custom_range');
        }
    }, []);

    const shiftMonths = React.useCallback((delta: number, context: 'personal' | 'business') => {
        const setter = context === 'personal' ? setPersonalBaseDate : setBusinessBaseDate;
        setter(prev => {
            const next = new Date(prev);
            next.setMonth(next.getMonth() + delta);
            return next;
        });
    }, []);

    // Helper for calculations
    const calculate = React.useCallback((mode: PeriodMode, range: DateRange | undefined, baseDate: Date) => {
        const incomeDate = incomeProfile?.incomeDate;

        if (mode === 'custom' && range?.from) {
            const start = startOfDay(range.from);
            const end = endOfDay(range.to || range.from);
            return { startDate: start, endDate: end, label: 'Custom Range' };
        }

        // If an income date is set, both 'monthly' and 'incomeCycle' modes 
        // should follow the set cycle as requested.
        if ((mode === 'monthly' || mode === 'incomeCycle') && incomeDate) {
            const cycleRange = getIncomeCycleRange(incomeDate, baseDate);
            return { 
                ...cycleRange, 
                label: mode === 'monthly' ? `Cycle (${format(cycleRange.startDate, 'MMM d')} - ${format(cycleRange.endDate, 'MMM d')})` : 'Pay Cycle' 
            };
        }

        return { startDate: startOfMonth(baseDate), endDate: endOfMonth(baseDate), label: format(baseDate, 'MMMM yyyy') };
    }, [incomeProfile?.incomeDate]);

    const personalRes = useMemo(() => calculate(personalMode, personalRange, personalBaseDate), [personalMode, personalRange, personalBaseDate, calculate]);
    const businessRes = useMemo(() => calculate(businessMode, businessRange, businessBaseDate), [businessMode, businessRange, businessBaseDate, calculate]);

    const activeMode = isBusinessContext ? businessMode : personalMode;
    const activeRange = isBusinessContext ? businessRange : personalRange;
    const activeRes = isBusinessContext ? businessRes : personalRes;

    const value = useMemo(() => ({
        // Active shorthand
        periodMode: activeMode,
        setPeriodMode: isBusinessContext ? setBusinessMode : setPersonalMode,
        startDate: activeRes.startDate,
        endDate: activeRes.endDate,
        customRange: activeRange,
        setCustomRange: isBusinessContext ? setBusinessRange : setPersonalRange,
        label: activeRes.label,
        baseDate: isBusinessContext ? businessBaseDate : personalBaseDate,
        shiftMonths: (delta: number) => shiftMonths(delta, isBusinessContext ? 'business' : 'personal'),

        // Explicit Personal
        personal: {
            periodMode: personalMode,
            setPeriodMode: setPersonalMode,
            customRange: personalRange,
            setCustomRange: setPersonalRange,
            startDate: personalRes.startDate,
            endDate: personalRes.endDate,
            label: personalRes.label,
            baseDate: personalBaseDate,
            shiftMonths: (delta: number) => shiftMonths(delta, 'personal'),
        },

        // Explicit Business
        business: {
            periodMode: businessMode,
            setPeriodMode: setBusinessMode,
            customRange: businessRange,
            setCustomRange: setBusinessRange,
            startDate: businessRes.startDate,
            endDate: businessRes.endDate,
            label: businessRes.label,
            baseDate: businessBaseDate,
            shiftMonths: (delta: number) => shiftMonths(delta, 'business'),
        }
    }), [activeMode, activeRange, activeRes, personalMode, personalRange, personalRes, businessMode, businessRange, businessRes, isBusinessContext, personalBaseDate, businessBaseDate, shiftMonths]);

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
