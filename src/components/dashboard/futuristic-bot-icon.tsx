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
          .pulse-circle {
            animation: pulse 2.5s infinite ease-out;
            transform-origin: center;
            stroke: currentColor;
          }
          @keyframes pulse {
            0% {
              stroke-width: 0;
              r: 9;
              opacity: 0.8;
            }
            100% {
              stroke-width: 2;
              r: 12;
              opacity: 0;
            }
          }
        `}
      </style>
      <circle className="pulse-circle" cx="12" cy="12" r="9" strokeWidth="2" />
      <circle className="pulse-circle" style={{ animationDelay: '1.25s' }} cx="12" cy="12" r="9" strokeWidth="2" />
      
      {/* Central icon */}
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        {/* The outer ring of the bot's head */}
        <circle cx="12" cy="12" r="8" fill="none"/>
        
        {/* The 'eye' */}
        <circle cx="12" cy="12" r="2.5" fill="currentColor"/>

        {/* Circuit lines */}
        <path d="M12 4 V 6" />
        <path d="M12 18 V 20" />
        <path d="M4 12 H 6" />
        <path d="M18 12 H 20" />

        <path d="M17 7 L 15.5 8.5" />
        <path d="M7 17 L 8.5 15.5" />

        <path d="M7 7 L 8.5 8.5" />
        <path d="M17 17 L 15.5 15.5" />
      </g>
    </svg>
  );
}
