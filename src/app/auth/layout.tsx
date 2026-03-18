'use client';

import { useUser, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { Logo } from '@/components/logo';
import { getRedirectResult } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // If auth is done loading and we have a user, redirect to dashboard.
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!auth) {
      return;
    }
    
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          toast({
            title: 'Sign-In Successful',
            description: `Welcome, ${result.user.displayName}!`,
          });
          // The other useEffect will handle the redirect to /dashboard
        }
      })
      .catch((error) => {
        console.error("Redirect result error:", error);
        toast({
          variant: 'destructive',
          title: 'Sign-In Failed',
          description: error.message,
        });
      });
  }, [auth, toast]);

  // While we're checking for auth state or if we have a user and are about to redirect,
  // show a loader. This prevents the login/signup form from flashing.
  if (isUserLoading || user) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4">
        <Loader />
        <p className="text-muted-foreground">
          {user ? 'Redirecting to dashboard...' : 'Connecting to services...'}
        </p>
      </main>
    );
  }

  // If auth check is complete and there's no user, render the actual page content.
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
