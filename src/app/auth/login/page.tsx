'use client';

import { Logo } from '@/components/logo';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SignInForm } from '@/components/auth/signin-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If auth is done loading and we have a user, redirect.
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  // While we're checking for auth state, or if we have a user and are about to redirect,
  // show a loader. This prevents the login form from flashing.
  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4">
        <Logo />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{user ? 'Redirecting to dashboard...' : 'Connecting to services...'}</span>
        </div>
      </div>
    );
  }

  // Only render the form if auth is checked and there's no user.
  return (
    <motion.div 
        className="flex w-full max-w-sm flex-col items-center justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
      <div className="mb-8 w-full text-center">
        <Logo className="mx-auto mb-4 lg:hidden" />
        <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground">
          Welcome Back
        </h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to access your dashboard.
        </p>
      </div>

      <div className="w-full">
        <SignInForm />
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Button variant="link" className="p-0 h-auto font-semibold" asChild>
          <Link href="/auth/signup">
            Sign up
          </Link>
        </Button>
      </p>

      <p className="mt-8 px-8 text-center text-xs text-muted-foreground">
        By signing in, you agree to our{' '}
        <Link href="/terms-of-service" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy-policy" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </Link>
        .
      </p>
    </motion.div>
  );
}
