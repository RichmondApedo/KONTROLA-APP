'use client';

import { useUser, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/logo';
import { getRedirectResult } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { AuthFeatureShowcase } from '@/components/auth/auth-feature-showcase';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (auth) {
      console.log('AuthLayout: Checking for redirect result...');
      getRedirectResult(auth)
        .then((result) => {
          if (!isMounted) return;
          if (result) {
            console.log('AuthLayout: Redirect sign-in successful for:', result.user.email);
            toast({ title: 'Sign In Successful', description: 'Welcome back!' });
          } else {
            console.log('AuthLayout: No redirect result found.');
          }
        })
        .catch((error) => {
          if (!isMounted) return;
          console.error('AuthLayout: Redirect Result Error:', error);

          let title = 'Google Sign-In Failed';
          let description = error.message;
          if (error.code === 'auth/cross-origin-auth-not-supported') {
            description = 'This browser does not support the required redirect flow. Please try a different browser or sign in with email.';
          } else if (error.code === 'auth/popup-blocked') {
            description = 'The sign-in popup was blocked. Please allow popups for this site.';
          } else if (error.code === 'auth/internal-error') {
            description = 'An internal authentication error occurred. Please try again in a few moments.';
          }
          toast({
            variant: 'destructive',
            title,
            description: `Error: ${description} (Code: ${error.code || 'N/A'})`,
            duration: 10000,
          });
        })
        .finally(() => {
          if (isMounted) setIsCheckingRedirect(false);
        });
    }

    return () => { isMounted = false; };
  }, [auth, toast]);

  useEffect(() => {
    if (!isUserLoading && !isCheckingRedirect && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, isCheckingRedirect, router]);

  // Loading / redirect state
  if (isUserLoading || isCheckingRedirect || user) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-[#0a0a0f] p-4">
        <div className="flex w-full max-w-xs flex-col items-center gap-6 text-center">
          <Logo />
          <div className="w-full">
            <p className="animate-pulse mb-2 text-white/50 text-sm">
              {user ? 'Redirecting...' : (isCheckingRedirect ? 'Finalizing sign-in...' : 'Connecting...')}
            </p>
            <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className="absolute h-full animate-loading-bar bg-emerald-500" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-2 bg-[#0a0a0f]">
      {/* Left – 3D animated showcase (desktop only) */}
      <div className="hidden lg:block relative overflow-hidden">
        <AuthFeatureShowcase />
      </div>

      {/* Right – Form panel */}
      <div className="relative flex min-h-screen items-center justify-center p-6 sm:p-12 bg-[#0d0d15]">
        {/* Subtle radial glow behind the form */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(16,185,129,0.07) 0%, transparent 70%)',
          }}
        />

        {/* Dark-theme overrides scoped to the auth form */}
        <style>{`
          .auth-form-panel input,
          .auth-form-panel textarea {
            background: rgba(255,255,255,0.05) !important;
            border-color: rgba(255,255,255,0.1) !important;
            color: #fff !important;
            border-radius: 10px !important;
          }
          .auth-form-panel input::placeholder {
            color: rgba(255,255,255,0.25) !important;
          }
          .auth-form-panel input:focus {
            border-color: rgba(16,185,129,0.5) !important;
            box-shadow: 0 0 0 3px rgba(16,185,129,0.12) !important;
            outline: none !important;
          }
          .auth-form-panel label {
            color: rgba(255,255,255,0.6) !important;
            font-size: 0.78rem !important;
            font-weight: 500 !important;
            letter-spacing: 0.03em !important;
          }
          .auth-form-panel [data-slot="form-message"] {
            color: rgba(248,113,113,0.9) !important;
          }
          /* Google / Outline button — dark styled */
          .auth-form-panel button[variant="outline"],
          .auth-form-panel .btn-google {
            background: rgba(255,255,255,0.06) !important;
            border-color: rgba(255,255,255,0.1) !important;
            color: rgba(255,255,255,0.85) !important;
          }
          .auth-form-panel button[variant="outline"]:hover,
          .auth-form-panel .btn-google:hover {
            background: rgba(255,255,255,0.1) !important;
          }
          /* The OR divider */
          .auth-form-panel .auth-divider-bg {
            background: #0d0d15 !important;
            color: rgba(255,255,255,0.3) !important;
          }
          /* Ghost button (show/hide password) */
          .auth-form-panel button[data-ghost] {
            color: rgba(255,255,255,0.35) !important;
          }
          /* Forgot password link */
          .auth-form-panel .btn-link {
            color: rgba(255,255,255,0.35) !important;
          }
          .auth-form-panel .btn-link:hover {
            color: rgba(16,185,129,0.85) !important;
          }
        `}</style>

        <div className="auth-form-panel relative z-10 w-full max-w-sm">
          {children}
        </div>
      </div>
    </main>
  );
}
