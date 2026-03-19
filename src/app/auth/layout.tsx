'use client';

import { useUser, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader } from '@/components/ui/loader';
import { Logo } from '@/components/logo';
import { getRedirectResult } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);

  useEffect(() => {
    if (auth) {
      getRedirectResult(auth)
        .then((result) => {
          if (result) {
            toast({
              title: 'Sign In Successful',
              description: `Welcome, ${result.user.displayName}!`,
            });
          }
        })
        .catch((error) => {
          console.error("Redirect sign-in error:", error);
          if (error.code === 'auth/account-exists-with-different-credential') {
            toast({
              variant: 'destructive',
              title: 'Sign-in failed',
              description: 'An account already exists with this email using a different sign-in method. Please sign in with the original method.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Sign-in failed',
              description: `An unexpected error occurred. (Code: ${error.code})`,
            });
          }
        })
        .finally(() => {
          setIsProcessingRedirect(false);
        });
    } else {
      setIsProcessingRedirect(false);
    }
  }, [auth, toast]);

  useEffect(() => {
    // If auth is done loading and we have a user, redirect to dashboard.
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  // Show a loader while checking initial auth state OR if we have a user (and are about to redirect).
  if (isUserLoading || user || isProcessingRedirect) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4">
        <Logo />
        <Loader />
        <p className="text-muted-foreground">
          {isProcessingRedirect
            ? 'Finalizing sign-in...'
            : user
            ? 'Redirecting to dashboard...'
            : 'Connecting to KONTROLA...'}
        </p>
      </main>
    );
  }

  // If auth check is complete and there's no user, render the page content.
  return (
      <main className="min-h-screen w-full lg:grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col items-center justify-center bg-muted/20 p-8 text-center">
            <div className="w-full max-w-md">
                <Logo />
                <h2 className="text-3xl font-bold font-headline text-foreground mt-6">
                    Take Control of Your Finances
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                    The all-in-one platform to track, manage, and grow your money.
                </p>
            </div>
        </div>
        <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
            {children}
        </div>
      </main>
  );
}
