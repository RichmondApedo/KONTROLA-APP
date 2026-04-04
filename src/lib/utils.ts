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
