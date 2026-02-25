'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { useAuth, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SignUpForm } from '@/components/auth/signup-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function SignUpPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isAuthReady, setIsAuthReady] = useState(false);


  useEffect(() => {
    // This effect now correctly waits for isUserLoading to be false
    // before attempting a redirect.
    if (!isUserLoading) {
      if (user) {
        router.push('/dashboard');
      } else {
        // If there's no user and loading is done, auth is "ready" to show the form
        setIsAuthReady(true);
      }
    }
  }, [user, isUserLoading, router]);


  // The loading state is now simpler: it's true only while the initial
  // user status is being determined.
  if (isUserLoading || !isAuthReady) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4">
        <Logo />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Connecting to services...</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <Logo className="mx-auto mb-4" />
        <CardTitle className="font-headline text-2xl">
          Create your KONTROLA account
        </CardTitle>
        <CardDescription>
          Start your journey to financial freedom.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <SignUpForm />
        <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Button variant="link" className="p-0 h-auto" asChild>
            <Link href="/auth/login">
              Sign In
            </Link>
          </Button>
        </div>
        <Separator />
        <div className="px-4 text-center text-sm text-muted-foreground space-y-2">
            <p>
                By continuing, you agree to our{' '}
                <Link
                href="/terms-of-service"
                className="underline underline-offset-4 hover:text-primary"
                >
                Terms of Service
                </Link>
                {' '}and{' '}
                <Link
                href="/privacy-policy"
                className="underline underline-offset-4 hover:text-primary"
                >
                Privacy Policy
                </Link>
                .
            </p>
            <div className="flex justify-center gap-x-4 pt-2 text-xs">
                <Link href="/" className="underline underline-offset-4 hover:text-primary">Home</Link>
                <Link href="/privacy-policy" className="underline underline-offset-4 hover:text-primary">Privacy</Link>
                <Link href="/terms-of-service" className="underline underline-offset-4 hover:text-primary">Terms</Link>
            </div>
            <p className="pt-2 text-xs">
                Kontrola does not provide banking, investment, or payment services.
                Kontrola only accesses financial data in read-only mode through secure third-party providers.
            </p>
        </div>
      </CardContent>
    </Card>
  );
}
