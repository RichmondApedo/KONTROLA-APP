import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export function Logo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('font-headline text-primary font-bold text-2xl', className)} {...props}>
      KONTROLA
    </div>
  );
}
