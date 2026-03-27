'use client';

import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';

interface AuthLoadingProps {
  message?: string;
  className?: string;
}

export function AuthLoading({ message, className }: AuthLoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-8 text-center animate-in fade-in duration-700", className)}>
      <div className="relative">
        {/* Outer subtle glow */}
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl animate-pulse" />
        
        {/* Circular progress ring (decorative) */}
        <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="48"
            stroke="currentColor"
            strokeWidth="0.5"
            fill="transparent"
            className="text-white/10"
          />
          <circle
            cx="50"
            cy="50"
            r="48"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="301.59"
            strokeDashoffset="200"
            fill="transparent"
            strokeLinecap="round"
            className="text-emerald-500/40 animate-[spin_3s_linear_infinite]"
          />
        </svg>

        {/* Central Logo */}
        <div className="absolute inset-0 flex items-center justify-center">
            <Logo className="h-16 w-16 !text-4xl text-white scale-125 transition-transform duration-500" hideText />
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-headline text-lg font-bold tracking-wider text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white/60">
          {message || 'KONTROLA'}
        </p>
        <div className="flex items-center justify-center gap-1">
            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce" />
        </div>
      </div>
    </div>
  );
}
