'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { Logo } from '@/components/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If the initial user check is done and we have a user, then we can safely redirect.
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);
  
  // If we are loading, or if a user is already found (and we're about to redirect), show the loader.
  if (isUserLoading || user) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4">
        <div className="flex w-full max-w-xs flex-col items-center gap-6 text-center">
            <Logo />
            <div className="w-full">
                <p className="animate-pulse mb-2 text-muted-foreground">
                  {user
                    ? 'Redirecting to dashboard...'
                    : 'Connecting to KONTROLA...'}
                </p>
                <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div className="absolute h-full animate-loading-bar bg-primary"></div>
                </div>
            </div>
        </div>
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
