'use client';

import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SignInForm } from '@/components/auth/signin-form';

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center justify-center">
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
    </div>
  );
}
