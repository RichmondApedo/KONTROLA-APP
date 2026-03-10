'use client';
import { cn } from '@/lib/utils';
import type { SVGProps } from 'react';

export function FuturisticBotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>
        {`
          .pulse-circle-modern {
            animation: pulse-modern 2.5s infinite ease-out;
            transform-origin: center;
            stroke: currentColor;
            stroke-width: 1;
          }
          @keyframes pulse-modern {
            0% {
              r: 8;
              opacity: 0.7;
            }
            100% {
              r: 12;
              opacity: 0;
            }
          }
        `}
      </style>
      <circle className="pulse-circle-modern" cx="12" cy="12" r="8" />
      <circle className="pulse-circle-modern" style={{ animationDelay: '1.25s' }} cx="12" cy="12" r="8" />
      
      {/* Central icon */}
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer ring */}
        <circle cx="12" cy="12" r="7" fill="none"/>
        
        {/* Modern Eye - like a camera shutter or iris */}
        <circle cx="12" cy="12" r="2" fill="currentColor" fillOpacity="0.5"/>
        <path d="M12 9 V 10" />
        <path d="M12 15 V 14" />
        <path d="M9 12 H 10" />
        <path d="M15 12 H 14" />

        {/* Simplified corner circuits */}
        <path d="M6.5 6.5 L 8 8" />
        <path d="M17.5 17.5 L 16 16" />
        <path d="M6.5 17.5 L 8 16" />
        <path d="M17.5 6.5 L 16 8" />
      </g>
    </svg>
  );
}
