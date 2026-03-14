'use client';
import { type SVGProps } from 'react';

// A more complex, futuristic bot icon.
// The expensive SVG filter has been removed and replaced with a more performant CSS drop-shadow in the parent component.
export function FuturisticBotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
        {/* Head */}
        <path
          d="M12 2C9.23858 2 7 4.23858 7 7V8C7 9.65685 8.34315 11 10 11H14C15.6569 11 17 9.65685 17 8V7C17 4.23858 14.7614 2 12 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        {/* Eyes - can be animated */}
        <circle cx="10.5" cy="7.5" r="1" fill="currentColor" className="animate-pulse" />
        <circle cx="13.5" cy="7.5" r="1" fill="currentColor" className="animate-pulse" />
        {/* Body */}
        <path
          d="M17 11H7C5.89543 11 5 11.8954 5 13V17C5 18.1046 5.89543 19 7 19H17C18.1046 19 19 18.1046 19 17V13C19 11.8954 18.1046 11 17 11Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        {/* Floating Base */}
        <path
          d="M7 21C7 21.5523 8.34315 22 10 22H14C15.6569 22 17 21.5523 17 21C17 20.4477 15.6569 20 14 20H10C8.34315 20 7 20.4477 7 21Z"
          fill="currentColor"
        />
    </svg>
  );
}
