import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD', options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    ...options,
  }).format(amount);
}

/**
 * Strips floating-point precision errors (e.g. 0.1 + 0.2 = 0.30000000004)
 * Rounds reliably to exactly two decimal places.
 */
export function preciseRound(num: number, decimals: number = 2): number {
    if (isNaN(num) || num === null) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
}

/**
 * Robustly formats any date-like value (Firestore Timestamp, JS Date, ISO string).
 * Prevents "Invalid Date" crashes that often cause Application Errors in React.
 */
export function safeFormatDate(d: any, formatStr: string = 'PPP'): string {
    if (!d) return '';
    try {
        const dateObj = d.toDate ? d.toDate() : new Date(d);
        if (isNaN(dateObj.getTime())) return '';
        return format(dateObj, formatStr);
    } catch {
        return '';
    }
}
