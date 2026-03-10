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
      <defs>
        <linearGradient id="bot-body-gradient" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="bot-visor-gradient" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.3" />
          <stop offset="100%" stopColor="white" stopOpacity="0.1" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
      </defs>

      <style>
        {`
          .pulse-glow-k {
            animation: pulse-glow-k-3d 4s infinite ease-in-out;
          }
          @keyframes pulse-glow-k-3d {
            0%, 100% {
              filter: url(#glow);
              opacity: 0.5;
            }
            50% {
              filter: url(#glow);
              opacity: 1;
            }
          }
          .scan-line-k {
            animation: scan-k-3d 3s linear infinite;
            stroke: #fff;
            stroke-width: 1;
          }
          @keyframes scan-k-3d {
            0% {
              transform: translateY(0px);
              opacity: 0;
            }
            20% {
              transform: translateY(2px);
              opacity: 0.8;
            }
            80% {
              transform: translateY(8px);
              opacity: 0.8;
            }
            100% {
              transform: translateY(10px);
              opacity: 0;
            }
          }
        `}
      </style>
      
      {/* 3D Base/Shadow */}
      <path d="M18 8H6C4.89543 8 4 8.89543 4 10V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V10C20 8.89543 19.1046 8 18 8Z" fill="currentColor" opacity="0.2" transform="translate(0, 1)"/>

      {/* Main bot head shape with Gradient */}
      <path d="M18 7H6C4.89543 7 4 7.89543 4 9V17C4 18.1046 4.89543 19 6 19H18C19.1046 19 20 18.1046 20 17V9C20 7.89543 19.1046 7 18 7Z" fill="url(#bot-body-gradient)" stroke="currentColor" strokeWidth="0.5" />
      
      {/* Highlight on top */}
      <path d="M5 9C5 8.44772 5.44772 8 6 8H18C18.5523 8 19 8.44772 19 9" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>

      {/* Neck */}
      <path d="M14 19V21C14 21.5523 13.5523 22 13 22H11C10.4477 22 10 21.5523 10 21V19" fill="currentColor" opacity="0.5"/>
      
      {/* Antennas */}
      <path d="M8 7V5.5C8 4.67157 8.67157 4 9.5 4H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 7V5.5C16 4.67157 15.3284 4 14.5 4H14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9.5" cy="3" r="1.2" fill="currentColor" className="pulse-glow-k" />
      
      {/* Face/Visor with 3D effect */}
      <g transform="translate(0, 1)">
        <rect x="7" y="10" width="10" height="6" rx="1" fill="black" opacity="0.2"/>
        <rect x="7" y="9.5" width="10" height="6" rx="1" fill="url(#bot-visor-gradient)" />
        <g className="scan-line-k">
          <path d="M7.5 11 H16.5" />
        </g>
        
        {/* "K" integrated as a subtle detail in the visor */}
        <path d="M9.5 11 v 3" stroke="white" strokeWidth="1" opacity="0.4"/>
        <path d="M12 11 l -2.5 1.5 l 2.5 1.5" stroke="white" strokeWidth="1" opacity="0.4"/>
      </g>
    </svg>
  );
}
