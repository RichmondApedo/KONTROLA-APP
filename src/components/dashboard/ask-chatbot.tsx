'use client';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FuturisticBotIcon } from './futuristic-bot-icon';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function AskChatbot() {
  const iconRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // State for position and dragging status
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Refs to store values that persist across renders without causing re-renders
  const initialPos = useRef({ x: 0, y: 0 }); // Element's position when drag starts
  const initialMousePos = useRef({ x: 0, y: 0 }); // Mouse's position when drag starts
  const hasDragged = useRef(false);
  
  // State to ensure this only runs on the client
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    // This effect runs only once on the client-side
    setIsClient(true);
    // Position the icon at the bottom right on initial render, accounting for mobile/desktop
    const isMobile = window.innerWidth < 768;
    setPosition({
      x: window.innerWidth - 80,
      y: window.innerHeight - (isMobile ? 160 : 80),
    });
  }, []);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (!iconRef.current) return;
    
    // Store initial positions
    initialPos.current = position;
    initialMousePos.current = { x: clientX, y: clientY };
    hasDragged.current = false;
    
    setIsDragging(true);
    document.body.style.userSelect = 'none'; // Prevent text selection
  }, [position]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !iconRef.current) return;

    // Calculate distance moved from start
    const dx = clientX - initialMousePos.current.x;
    const dy = clientY - initialMousePos.current.y;
    
    // Only register as a "drag" if moved more than a small threshold
    if (!hasDragged.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      hasDragged.current = true;
    }
    
    // Calculate new position
    let newX = initialPos.current.x + dx;
    let newY = initialPos.current.y + dy;

    // Clamp position within the viewport
    const rect = iconRef.current.getBoundingClientRect();
    newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
    newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));

    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      // If it wasn't a drag, it was a click. Navigate.
      if (!hasDragged.current) {
         if (pathname !== '/dashboard/help') {
            router.push('/dashboard/help');
        }
      }
      setIsDragging(false);
      document.body.style.userSelect = '';
    }
  }, [isDragging, router, pathname]);

  // Mouse event handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Primary mouse button
      handleDragStart(e.clientX, e.clientY);
    }
  };

  // Touch event handlers
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // Effect to add/remove global event listeners
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    
    const onMouseUp = () => handleDragEnd();
    const onTouchEnd = () => handleDragEnd();

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
      window.addEventListener('touchcancel', onTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);
  
  // Render a non-interactive placeholder on the server to prevent layout shift
  if (!isClient) {
    return (
        <div className='fixed bottom-24 right-4 md:bottom-6 md:right-6 pointer-events-none z-30'>
             <div
                className={cn(
                buttonVariants({ variant: 'default', size: 'icon' }),
                'flex h-14 w-14 flex-col items-center justify-center rounded-full shadow-lg leading-none'
                )}
            >
                <FuturisticBotIcon className="h-7 w-7" />
                <span className="mt-1 text-xs font-bold">Ask</span>
            </div>
        </div>
    );
  }

  return (
    <div
      ref={iconRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        touchAction: 'none',
      }}
      className={cn(
        'z-30 cursor-grab',
        isDragging && 'cursor-grabbing',
        buttonVariants({ variant: 'default', size: 'icon' }),
        'flex h-14 w-14 flex-col items-center justify-center rounded-full shadow-lg leading-none'
      )}
      title="Ask KONTROLA"
    >
      <FuturisticBotIcon className="h-7 w-7 pointer-events-none" />
      <span className="mt-1 text-xs font-bold pointer-events-none">Ask</span>
    </div>
  );
}
