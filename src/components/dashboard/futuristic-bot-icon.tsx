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
        
        {/* Stylized 'K' for Kontrola */}
        <path d="M10 9 v 6" />
        <path d="M14 9 l -4 3 l 4 3" />

      </g>
    </svg>
  );
}
