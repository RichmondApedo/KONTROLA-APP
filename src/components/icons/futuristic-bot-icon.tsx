import type { SVGProps } from 'react';

export function FuturisticBotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary) / 0.5)" />
                <stop offset="100%" stopColor="hsl(var(--accent) / 0.7)" />
            </linearGradient>
            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
                <feOffset in="blur" dx="2" dy="2" result="offsetBlur"/>
                <feMerge>
                    <feMergeNode in="offsetBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            <style>
                {`
                    @keyframes float {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-1.5px); }
                    }
                    @keyframes pulse {
                        0%, 100% { stroke-opacity: 0.5; }
                        50% { stroke-opacity: 1; }
                    }
                    @keyframes sparkle {
                        0%, 100% { r: 0; opacity: 0; }
                        50% { r: 1.5; opacity: 1; }
                        60% { r: 0.5; opacity: 1; }
                    }
                    .float-group {
                        animation: float 5s ease-in-out infinite;
                    }
                    .pulse-line {
                        animation: pulse 3s ease-in-out infinite;
                    }
                    .sparkle {
                        animation: sparkle 4s ease-in-out infinite;
                        animation-delay: 1s;
                    }
                `}
            </style>
        </defs>

        <g className="float-group" filter="url(#dropShadow)">
            {/* Back layer for 3D effect */}
            <path d="M 50 2 L 93.3 26 V 74 L 50 98 L 6.7 74 V 26 Z" fill="hsl(var(--primary) / 0.2)" transform="translate(2, 2)"/>

            {/* Main Hexagon */}
            <path d="M 50 2 L 93.3 26 V 74 L 50 98 L 6.7 74 V 26 Z" fill="url(#bgGradient)" stroke="hsl(var(--accent))" strokeWidth="1.5" />
            
            {/* Inner glowing lines - this will now pulse */}
            <path className="pulse-line" d="M 50 12 L 85 31 V 69 L 50 88 L 15 69 V 31 Z" fill="none" stroke="hsl(var(--primary-foreground) / 0.5)" strokeWidth="1" />

            {/* Sparkle effect on a corner */}
            <circle className="sparkle" cx="93.3" cy="26" r="0" fill="hsl(var(--primary-foreground))" />

            {/* Text */}
            <text x="50" y="48" fontFamily="Poppins, sans-serif" fontSize="20" fill="hsl(var(--foreground))" textAnchor="middle" fontWeight="700" letterSpacing="1" stroke="hsl(var(--background))" strokeWidth="0.3">
                ASK
            </text>
            <text x="50" y="68" fontFamily="Poppins, sans-serif" fontSize="10" fill="hsl(var(--foreground))" textAnchor="middle" letterSpacing="0.5" fontWeight="600" stroke="hsl(var(--background))" strokeWidth="0.2">
                KONTROLA
            </text>
        </g>
    </svg>
  );
}
