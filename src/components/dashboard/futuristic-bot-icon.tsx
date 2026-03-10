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
          .pulse-glow-k {
            animation: pulse-glow-k 4s infinite ease-in-out;
            stroke: currentColor;
            stroke-width: 0.5;
            fill: currentColor;
          }
          @keyframes pulse-glow-k {
            0%, 100% {
              opacity: 0.2;
            }
            50% {
              opacity: 0.7;
            }
          }
          .scan-line-k {
            animation: scan-k 3s linear infinite;
            stroke: currentColor;
            stroke-width: 0.75;
          }
          @keyframes scan-k {
            0% {
              transform: translateY(-2px);
              opacity: 0;
            }
            20% {
              transform: translateY(0px);
              opacity: 1;
            }
            80% {
              transform: translateY(6px);
              opacity: 1;
            }
            100% {
              transform: translateY(8px);
              opacity: 0;
            }
          }
        `}
      </style>
      
      {/* Main bot head shape */}
      <path d="M18 7H6C4.89543 7 4 7.89543 4 9V17C4 18.1046 4.89543 19 6 19H18C19.1046 19 20 18.1046 20 17V9C20 7.89543 19.1046 7 18 7Z" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Neck */}
      <path d="M14 19V21C14 21.5523 13.5523 22 13 22H11C10.4477 22 10 21.5523 10 21V19" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Antennas */}
      <path d="M8 7V5.5C8 4.67157 8.67157 4 9.5 4H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 7V5.5C16 4.67157 15.3284 4 14.5 4H14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9.5" cy="3" r="1" fill="currentColor" className="pulse-glow-k" />
      
      {/* Face/Visor */}
      <g transform="translate(0, 1)">
        <rect x="7" y="10" width="10" height="6" rx="1" fill="currentColor" opacity="0.1" />
        <g className="scan-line-k">
          <path d="M7 11 H17" />
        </g>
        
        {/* "K" integrated as a subtle detail in the visor */}
        <path d="M9.5 11.5 v 3" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
        <path d="M12 11.5 l -2.5 1.5 l 2.5 1.5" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
      </g>
    </svg>
  );
}
