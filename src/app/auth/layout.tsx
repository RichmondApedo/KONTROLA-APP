
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
            // This means the user has just signed in via redirect.
            // The onAuthStateChanged listener in FirebaseProvider will handle the user state update.
            // We can show a success message.
            toast({
              title: 'Signed In Successfully',
              description: `Welcome, ${result.user.displayName || 'User'}!`,
            });
            // The other useEffect will handle the redirect to /dashboard.
          }
        })
        .catch((error) => {
          // Handle Errors here.
          console.error("Redirect sign-in error:", error);
          toast({
            variant: 'destructive',
            title: 'Sign-in Failed',
            description: `There was an error during the sign-in process. (Code: ${error.code})`,
          });
        })
        .finally(() => {
          // Whether it succeeded, failed, or there was no redirect result,
          // we can now stop showing the processing indicator.
          setIsProcessingRedirect(false);
        });
    } else {
        // Auth service isn't ready yet, so we're not processing a redirect.
        setIsProcessingRedirect(false);
    }
  }, [auth, router, toast]);


  useEffect(() => {
    // If auth is done loading and we have a user, redirect to dashboard.
    // We wait for the redirect processing to finish before attempting this.
    if (!isUserLoading && user && !isProcessingRedirect) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router, isProcessingRedirect]);

  // While we're checking for auth state, processing a redirect, or if we have a user and are about to redirect,
  // show a loader. This prevents the login/signup form from flashing.
  if (isUserLoading || user || isProcessingRedirect) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4">
        <Loader />
        <p className="text-muted-foreground">
          {user ? 'Redirecting to dashboard...' : (isProcessingRedirect ? 'Finalizing sign-in...' : 'Connecting to services...')}
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
