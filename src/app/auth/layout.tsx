
'use client';

import { useUser, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/logo';
import { getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);

  useEffect(() => {
    if (auth) {
      getRedirectResult(auth)
        .then((result) => {
          if (result) {
            // This means the user has just signed in via redirect.
            toast({
              title: 'Sign In Successful',
              description: 'Welcome!',
            });
            // The onAuthStateChanged listener in FirebaseProvider will handle the user state update and redirect.
          }
        })
        .catch((error) => {
          console.error('Redirect Result Error:', error);
          let description = 'An unexpected error occurred during sign-in.';
          if (error.code === 'auth/account-exists-with-different-credential') {
             const email = error.customData?.email;
             description = `The email ${email} is already associated with another sign-in method. Please sign in with the original method.`
          }
          toast({
            variant: 'destructive',
            title: 'Google Sign-In Failed',
            description,
            duration: 10000,
          });
        })
        .finally(() => {
          setIsCheckingRedirect(false);
        });
    } else {
        // If auth isn't ready yet, we're not checking.
        setIsCheckingRedirect(false);
    }
  }, [auth, toast]);

  useEffect(() => {
    // Redirect if user is already logged in and we're not in the middle of a redirect check.
    if (!isUserLoading && !isCheckingRedirect && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, isCheckingRedirect, router]);

  // Show a loader during the initial auth check OR while processing a redirect.
  if (isUserLoading || isCheckingRedirect || user) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4">
        <div className="flex w-full max-w-xs flex-col items-center gap-6 text-center">
            <Logo />
            <div className="w-full">
                <p className="animate-pulse mb-2 text-muted-foreground">
                  {user ? 'Redirecting...' : (isCheckingRedirect ? 'Finalizing sign-in...' : 'Connecting...')}
                </p>
                <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div className="absolute h-full animate-loading-bar bg-primary"></div>
                </div>
            </div>
        </div>
      </main>
    );
  }

  // If not loading and no user, show the auth forms.
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
