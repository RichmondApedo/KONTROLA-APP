'use client';

import { Logo } from '@/components/logo';
import { motion } from 'framer-motion';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-2 relative overflow-hidden">
      <div className="hidden lg:flex flex-col items-center justify-center bg-primary/5 p-8 text-center relative">
        <motion.div
            className="absolute top-10 left-10 w-48 h-48 bg-primary/20 rounded-full"
            animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 10, 0],
            }}
            transition={{
                duration: 15,
                repeat: Infinity,
                repeatType: "mirror",
            }}
        />
        <motion.div
            className="absolute bottom-10 right-10 w-72 h-72 bg-accent/20 rounded-full"
             animate={{
                scale: [1, 1.2, 1],
            }}
            transition={{
                duration: 20,
                repeat: Infinity,
                repeatType: "mirror",
            }}
        />
         <motion.div
            className="absolute bottom-1/2 right-1/4 w-32 h-32 bg-primary/10 rounded-full"
             animate={{
                y: [0, -20, 0],
            }}
            transition={{
                duration: 10,
                repeat: Infinity,
                repeatType: "mirror",
            }}
        />

        <div className="relative z-10 w-full max-w-md">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                <Logo className="mx-auto text-4xl mb-6" />
            </motion.div>
            <motion.h2 
                className="text-3xl font-bold font-headline text-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
            >
                Take Control of Your Finances
            </motion.h2>
            <motion.p 
                className="mt-4 text-lg text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
            >
                The all-in-one platform to track, manage, and grow your money.
            </motion.p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
          {children}
      </div>
    </main>
  );
}
