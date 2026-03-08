'use client';

import { useRef } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { FuturisticBotIcon } from '@/components/icons/futuristic-bot-icon';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function AskChatbot() {
  const constraintsRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-30">
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        className={cn(
          'fixed bottom-24 right-4 md:bottom-6 md:right-6 cursor-grab active:cursor-grabbing pointer-events-auto'
        )}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
          delay: 0.5,
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Go to Help Page"
      >
        <Link
          href="/dashboard/help"
          className={cn(
            buttonVariants({ variant: 'default', size: 'icon' }),
            'flex h-14 w-14 flex-col items-center justify-center rounded-full shadow-lg leading-none'
          )}
        >
          <FuturisticBotIcon className="h-7 w-7" />
          <span className="mt-0.5 text-[9px] font-bold">Ask</span>
          <span className="sr-only">Open Help Page</span>
        </Link>
      </motion.div>
    </div>
  );
}
