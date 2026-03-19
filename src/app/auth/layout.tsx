'use client';

import { useUser, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader } from '@/components/ui/loader';
import { Logo } from '@/components/logo';
import { getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  // We use this state to know if we are currently checking for a redirect result.
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);

  useEffect(() => {
    // This effect runs once when the 'auth' object becomes available.
    if (auth) {
      getRedirectResult(auth)
        .then((result) => {
          if (result) {
            // This was a sign-in via redirect.
            toast({
              title: 'Sign In Successful',
              description: `Welcome, ${result.user.displayName}!`,
            });
            // The `onAuthStateChanged` listener will handle the user object update
            // and trigger the redirect to the dashboard.
          }
        })
        .catch((error) => {
          console.error("Redirect sign-in error:", error);
          
          // Provide more specific error feedback
          if (error.code === 'auth/account-exists-with-different-credential') {
             const email = error.customData?.email;
             // We can't link accounts automatically on the client for security reasons.
             // We just inform the user.
            toast({
              variant: 'destructive',
              title: 'Email already in use',
              description: `The email ${email} is already associated with another sign-in method. Please sign in with the original method.`,
              duration: 10000,
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
          // Whether it succeeded or failed, we're done checking.
          setIsCheckingRedirect(false);
        });
    } else {
        // if auth is not available yet, we are not checking. when it's available, this effect will re-run.
    }
  }, [auth, toast, router]);

  useEffect(() => {
    // If the initial user check is done, and we are NOT in the middle of checking for a redirect,
    // and we HAVE a user, then we can safely redirect.
    if (!isUserLoading && !isCheckingRedirect && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, isCheckingRedirect, router]);
  
  // The overall loading state for the auth layout.
  // Show loader if Firebase is loading its user state OR if we're actively checking for a redirect result.
  const isLoading = isUserLoading || isCheckingRedirect;
  
  // If we are loading, or if a user is already found (and we're about to redirect), show the loader.
  if (isLoading || user) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4">
        <Logo />
        <Loader />
        <p className="text-muted-foreground">
          {isCheckingRedirect
            ? 'Finalizing sign-in...'
            : user
            ? 'Redirecting to dashboard...'
            : 'Connecting to KONTROLA...'}
        </p>
      </main>
    );
  }

  // If not loading and no user, show the sign-in/sign-up forms.
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
