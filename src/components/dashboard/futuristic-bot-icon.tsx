'use client';
import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

// A modern, 3D-style bot icon created with CSS.
export function FuturisticBotIcon({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative w-full h-full flex items-center justify-center", className)} {...props}>
      <div className="animate-float">
        {/* Main Body/Head Sphere */}
        <div className="w-8 h-8 rounded-full bg-primary relative shadow-lg">
          {/* 3D Highlight Effect */}
          <div
            className="absolute top-[3px] left-[3px] w-[calc(100%-6px)] h-[calc(100%-6px)] rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), transparent 70%)',
            }}
          ></div>
          {/* Eye */}
          <div className="absolute top-1/2 left-1/2 w-4 h-1.5 bg-primary-foreground rounded-full animate-blink-eye shadow-md"></div>
        </div>
        {/* Shadow */}
        <div 
          className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-4 h-1 bg-black/30 rounded-full blur-sm"
        ></div>
      </div>
    </div>
  );
}
