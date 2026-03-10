'use client';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { FuturisticBotIcon } from './futuristic-bot-icon';

export function AskChatbot() {
  return (
    <div
      className={cn(
        'fixed bottom-24 right-4 md:bottom-6 md:right-6 pointer-events-auto z-30 cursor-grab active:cursor-grabbing'
      )}
      title="Ask | Drag me!"
    >
      <Link
        href="/dashboard/help"
        className={cn(
          buttonVariants({ variant: 'default', size: 'icon' }),
          'flex h-14 w-14 flex-col items-center justify-center rounded-full shadow-lg leading-none'
        )}
        draggable={false}
      >
        <FuturisticBotIcon className="h-7 w-7" />
        <span className="mt-1 text-xs font-bold">Ask</span>
        <span className="sr-only">Ask</span>
      </Link>
    </div>
  );
}
