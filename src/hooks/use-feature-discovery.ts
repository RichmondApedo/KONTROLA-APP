'use client';

import { useState, useEffect, useCallback } from 'react';

interface DiscoveryState {
    lastShownAt: number; // timestamp
    showCount: number;
}

interface UseFeatureDiscoveryOptions {
    showIntervalDays?: number;
    maxShows?: number;
    enabled?: boolean;
}

/**
 * A hook to manage the occasional "discovery" of a feature.
 * Useful for showing "Pro-Tips" or "Did you know?" toasts without being intrusive.
 */
export function useFeatureDiscovery(
    featureKey: string,
    options: UseFeatureDiscoveryOptions = {}
) {
    const { 
        showIntervalDays = 3, 
        maxShows = 5, 
        enabled = true 
    } = options;

    const [shouldShow, setShouldShow] = useState(false);

    const checkDiscovery = useCallback(() => {
        if (!enabled) return;

        const storageKey = `kontrola_discovery_${featureKey}`;
        const raw = localStorage.getItem(storageKey);
        
        const now = Date.now();
        let state: DiscoveryState = { lastShownAt: 0, showCount: 0 };

        if (raw) {
            try {
                state = JSON.parse(raw);
            } catch (e) {
                console.error('Failed to parse discovery state', e);
            }
        }

        // Conditions for showing:
        // 1. Haven't exceeded max shows
        // 2. interval has passed
        const intervalMs = showIntervalDays * 24 * 60 * 60 * 1000;
        const timeSinceLastShow = now - state.lastShownAt;

        if (state.showCount < maxShows && timeSinceLastShow > intervalMs) {
            setShouldShow(true);
            
            // Mark as shown immediately to avoid double-triggers in double-renders (Strict mode)
            const newState: DiscoveryState = {
                lastShownAt: now,
                showCount: state.showCount + 1
            };
            localStorage.setItem(storageKey, JSON.stringify(newState));
        }
    }, [featureKey, enabled, showIntervalDays, maxShows]);

    useEffect(() => {
        // Wait a bit after load to show discovery tips so they don't fight with app load animations
        const timer = setTimeout(checkDiscovery, 2000);
        return () => clearTimeout(timer);
    }, [checkDiscovery]);

    const markAsDiscovered = useCallback(() => {
        const storageKey = `kontrola_discovery_${featureKey}`;
        const newState: DiscoveryState = {
            lastShownAt: Date.now(),
            showCount: 999 // Disable future shows
        };
        localStorage.setItem(storageKey, JSON.stringify(newState));
        setShouldShow(false);
    }, [featureKey]);

    return {
        shouldShow,
        markAsDiscovered,
        dismiss: () => setShouldShow(false)
    };
}
