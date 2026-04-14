'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SignUpForm } from '@/components/auth/signup-form';
import { Logo } from '@/components/logo';
import { Smartphone } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="w-full">
      {/* Mobile logo */}
      <div className="flex justify-center mb-8 lg:hidden">
        <Logo />
      </div>

      {/* Form card */}
      <div
        className="rounded-2xl border border-white/[0.07] p-8 shadow-2xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(16,185,129,0.06)',
        }}
      >
        <div className="mb-7">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-white">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-white/45">
            Start your journey to financial clarity today.
          </p>
        </div>

        <SignUpForm />

        <p className="mt-7 text-center text-sm text-white/40">
          Already have an account?{' '}
          <Button variant="link" className="p-0 h-auto font-semibold text-emerald-400 hover:text-emerald-300" asChild>
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => import('@/components/dashboard/pwa-install-prompt').then(mod => mod.triggerPWAInstall())}
            className="text-xs text-white/40 hover:text-white/60 hover:bg-white/5 font-bold uppercase tracking-widest gap-2"
          >
            <Smartphone className="h-4 w-4" />
            Get the KONTROLA App
          </Button>

          <p className="px-4 text-center text-xs text-white/25">
            By signing up, you agree to our{' '}
            <Link href="/terms-of-service" className="underline underline-offset-4 hover:text-white/50 transition-colors">
              Terms of Service
            </Link>{' '}and{' '}
            <Link href="/privacy-policy" className="underline underline-offset-4 hover:text-white/50 transition-colors">
              Privacy Policy
            </Link>.
          </p>
      </div>
    </div>
  );
}
