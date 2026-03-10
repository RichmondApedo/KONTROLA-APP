'use client';

import { useRef } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { FuturisticBotIcon } from './futuristic-bot-icon';

export function AskChatbot() {
  const constraintsRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={cn(
        'fixed bottom-24 right-4 md:bottom-6 md:right-6 pointer-events-auto z-30'
      )}
      title="Ask KONTROLA"
    >
      <Link
        href="/dashboard/help"
        className={cn(
          buttonVariants({ variant: 'default', size: 'icon' }),
          'flex h-14 w-14 flex-col items-center justify-center rounded-full shadow-lg leading-none'
        )}
      >
        <FuturisticBotIcon className="h-7 w-7" />
        <span className="mt-0.5 text-[9px] font-bold text-center leading-tight">Ask<br/>Kontrola</span>
        <span className="sr-only">Ask Kontrola</span>
      </Link>
    </div>
  );
}
