'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FuturisticBotIcon } from './futuristic-bot-icon';

export function AskChatbot() {
  return (
    <Link
      href="/dashboard/help"
      className={cn(
        buttonVariants({ variant: 'default', size: 'icon' }),
        'fixed bottom-24 right-4 z-30 flex h-14 w-14 flex-col items-center justify-center rounded-full shadow-lg leading-none md:bottom-6 md:right-6'
      )}
      title="Ask KONTROLA"
    >
      <FuturisticBotIcon className="h-7 w-7 pointer-events-none glow-primary" />
      <span className="mt-1 text-xs font-bold pointer-events-none">Ask</span>
    </Link>
  );
}
