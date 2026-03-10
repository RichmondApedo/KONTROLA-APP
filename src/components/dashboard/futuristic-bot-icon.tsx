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
              r: 8;
              opacity: 1;
            }
            100% {
              stroke-width: 1.5;
              r: 11;
              opacity: 0;
            }
          }
        `}
      </style>
      <circle className="pulse-circle" cx="12" cy="12" r="8" strokeWidth="2" />
      <circle className="pulse-circle" style={{ animationDelay: '1.25s' }} cx="12" cy="12" r="8" strokeWidth="2" />
      
      {/* Central icon */}
      <g>
        <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8Z" fill="currentColor"/>
        <path d="M12 10.5a2.5 2.5 0 1 0 2.5 2.5A2.5 2.5 0 0 0 12 10.5Z" fill="currentColor"/>
        <path d="M16 16.25c0-.69-.56-1.25-1.25-1.25H9.25c-.69 0-1.25.56-1.25 1.25v.5c0 .69.56 1.25 1.25 1.25h5.5c.69 0 1.25-.56 1.25-1.25v-.5Z" fill="currentColor"/>
      </g>
    </svg>
  );
}
