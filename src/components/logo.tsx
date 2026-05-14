import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  hideText?: boolean;
}

export function Logo({ className, hideText = false, ...props }: LogoProps) {
  return (
    <div className={cn('font-headline font-bold text-2xl flex items-center gap-3', className)} {...props}>
      <div className="relative h-8 w-8 shrink-0">
        <Image
          src="/logo.png"
          alt="KONTROLA Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
      {!hideText && <span className="text-primary tracking-tight">Kontrola</span>}
    </div>
  );
}
