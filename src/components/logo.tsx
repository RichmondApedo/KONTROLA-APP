import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export function Logo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('font-headline text-primary font-bold text-2xl flex items-center gap-2', className)} {...props}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
      >
        <path
            d="M2 7C2 5.89543 2.89543 5 4 5H20C21.1046 5 22 5.89543 22 7V17C22 18.1046 21.1046 19 20 19H4C2.89543 19 2 18.1046 2 17V7Z"
            stroke="currentColor"
            strokeWidth="2"
        />
        <path
            d="M7 12H12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
        />
      </svg>
      <span>KONTROLA</span>
    </div>
  );
}
