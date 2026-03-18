'use client';

import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

function SignUpFormSkeleton() {
  return (
    <div className="space-y-4">
      {/* Skeleton for TabsList */}
      <Skeleton className="h-10 w-full rounded-md" />
      {/* Skeleton for Form content */}
      <div className="space-y-4 pt-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}

const SignUpForm = dynamic(() => import('@/components/auth/signup-form').then(mod => mod.SignUpForm), {
    loading: () => <SignUpFormSkeleton />,
    ssr: false,
});


export default function SignUpPage() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center justify-center">
        <div className="mb-8 w-full text-center">
            <Logo className="mx-auto mb-4 lg:hidden" />
            <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground">
            Create an Account
            </h1>
            <p className="mt-2 text-muted-foreground">
            Start your journey to financial clarity.
            </p>
        </div>

        <div className="w-full">
            <SignUpForm />
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Button variant="link" className="p-0 h-auto font-semibold" asChild>
            <Link href="/auth/login">
                Sign in
            </Link>
            </Button>
        </p>

        <p className="mt-8 px-8 text-center text-xs text-muted-foreground">
            By signing up, you agree to our{' '}
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
