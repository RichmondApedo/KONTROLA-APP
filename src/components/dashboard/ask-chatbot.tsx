'use client';

import { useState, useRef, PointerEvent, memo } from 'react';
import { useRouter } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FuturisticBotIcon } from './futuristic-bot-icon';

export const AskChatbot = memo(function AskChatbot() {
  const router = useRouter();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });
  const isMovedRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    // Only respond to main/left button clicks to avoid weird context menu behaviors
    if (e.button !== 0) return;
    
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
    isMovedRef.current = false;
    setIsDragging(true);
  };

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    
    // Requires a small threshold distance to distinguish a click from a drag
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
       isMovedRef.current = true;
    }

    if (isMovedRef.current) {
       setPosition({
          x: positionStartRef.current.x + deltaX,
          y: positionStartRef.current.y + deltaY,
       });
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    // Boundary Snap Logic: smoothly bounce back if dragged completely off screen
    if (buttonRef.current) {
       const rect = buttonRef.current.getBoundingClientRect();
       let newX = position.x;
       let newY = position.y;

       if (rect.left < 0) {
           newX = position.x - rect.left + 16;
       }
       if (rect.right > window.innerWidth) {
           newX = position.x - (rect.right - window.innerWidth) - 16;
       }
       if (rect.top < 0) {
           newY = position.y - rect.top + 16;
       }
       if (rect.bottom > window.innerHeight) {
           newY = position.y - (rect.bottom - window.innerHeight) - 16;
       }

       if (newX !== position.x || newY !== position.y) {
           setPosition({ x: newX, y: newY });
       }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isMovedRef.current) {
      // It was a drag! Stop the navigation immediately.
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Genuine clean click! Navigate.
    router.push('/dashboard/ask');
  };

  return (
    <button
      ref={buttonRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
      className={cn(
        buttonVariants({ variant: 'default', size: 'icon' }),
        'fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 flex-col items-center justify-center rounded-full shadow-lg leading-none md:bottom-6 md:right-6 touch-none select-none',
        isDragging ? 'cursor-grabbing scale-95 opacity-90 shadow-2xl' : 'cursor-pointer hover:scale-105 transition-transform duration-200 ease-out'
      )}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        // Apply smooth transition ONLY when not dragging, so it snaps back to origin smoothly but tracks 1:1 during drag!
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}
      title="Ask KONTROLA"
    >
      <FuturisticBotIcon className="h-7 w-7 pointer-events-none glow-primary" />
      <span className="mt-1 text-xs font-bold pointer-events-none">Ask</span>
    </button>
  );
});
