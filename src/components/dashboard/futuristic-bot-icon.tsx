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
          .pulse-circle-k {
            animation: pulse-k 3s infinite ease-out;
            transform-origin: center;
            stroke: currentColor;
            stroke-width: 0.5;
          }
          @keyframes pulse-k {
            0% {
              r: 9;
              opacity: 0.8;
            }
            100% {
              r: 12;
              opacity: 0;
            }
          }
          .rotate-k {
            animation: rotate-k 25s linear infinite;
            transform-origin: center;
          }
          @keyframes rotate-k {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
      
      {/* Pulsing background rings */}
      <circle className="pulse-circle-k" cx="12" cy="12" r="9" />
      <circle className="pulse-circle-k" style={{ animationDelay: '1.5s' }} cx="12" cy="12" r="9" />
      
      {/* Central Static & Animated Elements */}
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer static container ring */}
        <circle cx="12" cy="12" r="10" strokeWidth="0.5" opacity="0.5" />

        {/* Inner rotating arcs */}
        <g className="rotate-k" style={{ animationDirection: 'reverse' }}>
            <path d="M 12 4 A 8 8 0 0 1 18.9 7.1" fill="none" strokeWidth="1" opacity="0.7"/>
            <path d="M 12 20 A 8 8 0 0 0 5.1 16.9" fill="none" strokeWidth="1" opacity="0.7"/>
        </g>
        
        {/* Core "K" logo */}
        <g strokeWidth="1.5">
            <circle cx="12" cy="12" r="7" fill="none" strokeWidth="0.75" />
            <path d="M10.5 9 v 6" />
            <path d="M14.5 9 l -4 3 l 4 3" />
        </g>
      </g>
    </svg>
  );
}
