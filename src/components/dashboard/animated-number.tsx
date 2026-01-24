'use client';

import { useCountUp } from '@/hooks/use-count-up';
import { formatCurrency } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  currency: string;
  options?: Intl.NumberFormatOptions;
  className?: string;
}

/**
 * A component that displays a number with a count-up animation and formats it as currency.
 */
export function AnimatedNumber({ value, currency, options, className }: AnimatedNumberProps) {
  const count = useCountUp(value);
  const formattedValue = formatCurrency(count, currency, options);

  return <span className={className}>{formattedValue}</span>;
}
