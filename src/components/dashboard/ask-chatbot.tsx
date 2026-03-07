'use client';

import { useRef } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function AskChatbot() {
  const constraintsRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-30">
        <Link href="/dashboard/help" passHref legacyBehavior>
            <motion.a
                drag
                dragConstraints={constraintsRef}
                dragMomentum={false}
                className={cn(
                    buttonVariants({ variant: "default", size: "icon" }),
                    "fixed bottom-24 right-4 flex h-14 w-14 flex-col items-center justify-center rounded-full shadow-lg leading-none md:bottom-6 md:right-6 cursor-grab active:cursor-grabbing pointer-events-auto"
                )}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.5,
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Go to Help Page"
            >
                <Bot className="h-6 w-6" />
                <span className="mt-0.5 text-[9px] font-bold">Ask</span>
                <span className="sr-only">Open Help Page</span>
            </motion.a>
        </Link>
    </div>
  );
}
