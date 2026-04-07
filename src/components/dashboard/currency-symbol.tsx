import React from 'react';
import { cn } from '@/lib/utils';

export type CurrencyCode = 'USD' | 'GHS' | 'EUR' | 'GBP' | 'CAD' | 'NGN' | string;

interface CurrencySymbolProps {
  currency?: CurrencyCode;
  className?: string;
}

const currencyMap: Record<string, string> = {
  USD: '$',
  GHS: '₵',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  NGN: '₦',
};

export function CurrencySymbol({ currency = 'USD', className }: CurrencySymbolProps) {
  const symbol = currencyMap[currency.toUpperCase()] || currency;
  
  return (
    <span className={cn("font-medium", className)}>
      {symbol}
    </span>
  );
}

/**
 * A wrapper for icons that should change based on currency.
 * If the currency is USD, it can show the DollarSign icon,
 * otherwise it shows the specific symbol text.
 */
export function CurrencyIcon({ currency = 'USD', className }: CurrencySymbolProps) {
  const symbol = currencyMap[currency.toUpperCase()] || currency;
  
  return (
    <div className={cn("flex items-center justify-center font-black", className)}>
      {symbol}
    </div>
  );
}
