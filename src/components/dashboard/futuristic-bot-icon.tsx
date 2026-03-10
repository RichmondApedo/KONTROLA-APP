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
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="bot-visor-gradient" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.3" />
          <stop offset="100%" stopColor="white" stopOpacity="0.1" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.7" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
        <clipPath id="visor-clip">
            <rect x="7" y="9.5" width="10" height="6" rx="1" />
        </clipPath>
      </defs>

      <style>
        {`
          .float-container-k {
            animation: float-k-3d 6s infinite ease-in-out;
          }
          @keyframes float-k-3d {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-1.5px);
            }
          }

          .pulse-glow-k {
            animation: pulse-glow-k-3d 3s infinite ease-in-out;
            transform-origin: center;
            transform-box: fill-box;
            filter: url(#glow);
          }
          @keyframes pulse-glow-k-3d {
            0%, 100% {
              transform: scale(1);
              opacity: 0.7;
            }
            50% {
              transform: scale(1.2);
              opacity: 1;
            }
          }
          
          .waveform-k {
              animation: waveform-k-anim 4s infinite linear;
          }
          @keyframes waveform-k-anim {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(0%); }
          }
        `}
      </style>
      
      <g className="float-container-k">
        {/* Shadow */}
        <path d="M18 8H6C4.89543 8 4 8.89543 4 10V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V10C20 8.89543 19.1046 8 18 8Z" fill="black" opacity="0.2" transform="translate(0.5, 1.5)"/>
        
        {/* Neck */}
        <path d="M14 19V21C14 21.5523 13.5523 22 13 22H11C10.4477 22 10 21.5523 10 21V19" fill="currentColor" opacity="0.6"/>

        {/* Side pieces */}
        <rect x="2.5" y="11" width="1.5" height="4" rx="0.75" fill="currentColor" opacity="0.7"/>
        <rect x="20" y="11" width="1.5" height="4" rx="0.75" fill="currentColor" opacity="0.7"/>

        {/* Main head shape */}
        <path d="M18 7H6C4.89543 7 4 7.89543 4 9V17C4 18.1046 4.89543 19 6 19H18C19.1046 19 20 18.1046 20 17V9C20 7.89543 19.1046 7 18 7Z" fill="url(#bot-body-gradient)" stroke="currentColor" strokeWidth="0.5" />
        
        {/* Highlight on top */}
        <path d="M5 9C5 8.44772 5.44772 8 6 8H18C18.5523 8 19 8.44772 19 9" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.3"/>

        {/* Antennas */}
        <path d="M8 7V5.5C8 4.67157 8.67157 4 9.5 4H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 7V5.5C16 4.67157 15.3284 4 14.5 4H14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="9.5" cy="3" r="1.2" fill="currentColor" className="pulse-glow-k" />
        
        {/* Face/Visor */}
        <g>
          <rect x="7" y="9.5" width="10" height="6" rx="1" fill="black" />
          
          <g clipPath="url(#visor-clip)" className="waveform-k">
            <path d="M3,12.5 C5,10.5 6,14.5 9,12.5 S 12,10.5 14,12.5 S 17,14.5 19,12.5 S 22,10.5, 24,12.5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5"/>
          </g>
          
          <rect x="7" y="9.5" width="10" height="6" rx="1" fill="url(#bot-visor-gradient)" />

          {/* "K" integrated as a subtle detail in the visor */}
          <path d="M9.5 11 v 3" stroke="white" strokeWidth="1" opacity="0.4" filter="url(#glow)"/>
          <path d="M12 11 l -2.5 1.5 l 2.5 1.5" stroke="white" strokeWidth="1" opacity="0.4" filter="url(#glow)"/>
        </g>
      </g>
    </svg>
  );
}
