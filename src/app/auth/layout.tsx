'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthLoading } from '@/components/auth/auth-loading';
import Image from 'next/image';

/**
 * AuthLayout: Handles redirect for already-authenticated users.
 * NOTE: getRedirectResult is handled EXCLUSIVELY in FirebaseProvider to avoid
 * consuming the one-time result in two places simultaneously.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // If user is already authenticated, redirect them away from auth pages
  useEffect(() => {
    if (!isUserLoading && user) {
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, isUserLoading, router]);

  // Show loading screen while auth state resolves, or while redirecting an authenticated user
  if (isUserLoading || user) {
    return (
      <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#0a0a0f] p-4 overflow-hidden">
        {/* Background Image for Loader */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="/images/auth-bg.png" 
            alt="Authentication Background" 
            fill 
            className="object-cover opacity-30 grayscale brightness-50"
            priority
          />
        </div>
        <div className="relative z-10 w-full max-w-xs transition-all duration-700 animate-in fade-in zoom-in-95">
          <AuthLoading 
            message={user ? 'Redirecting to Dashboard...' : 'Connecting to KONTROLA...'} 
          />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center bg-black overflow-hidden p-6 sm:p-12">
      {/* Immersive Background Image */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <Image 
          src="/images/auth-bg.png" 
          alt="Authentication Background" 
          fill 
          className="object-cover opacity-60 animate-in fade-in duration-1000"
          priority
        />
        {/* Gradient Overlays for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80 lg:from-black/40" />
      </div>

      {/* Dark-theme overrides scoped to the auth form */}
      <style>{`
        .auth-form-panel input,
        .auth-form-panel textarea {
          background: rgba(255,255,255,0.03) !important;
          border-color: rgba(255,255,255,0.08) !important;
          color: #fff !important;
          border-radius: 12px !important;
          height: 3.25rem !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .auth-form-panel input::placeholder {
          color: rgba(255,255,255,0.2) !important;
        }
        .auth-form-panel input:focus {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(16,185,129,0.4) !important;
          box-shadow: 0 0 0 1px rgba(16,185,129,0.4), 0 0 20px rgba(16,185,129,0.1) !important;
          outline: none !important;
          transform: translateY(-1px) !important;
        }
        .auth-form-panel label {
          color: rgba(255,255,255,0.5) !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          letter-spacing: 0.05em !important;
          text-transform: uppercase !important;
          margin-bottom: 0.5rem !important;
        }
        .auth-form-panel [data-slot="form-message"] {
          color: rgba(248,113,113,0.9) !important;
          font-size: 0.75rem !important;
          margin-top: 0.25rem !important;
        }
        /* Buttons */
        .auth-form-panel button[type="submit"] {
           background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
           border: none !important;
           font-weight: 700 !important;
           letter-spacing: 0.02em !important;
           height: 3.25rem !important;
           border-radius: 12px !important;
           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .auth-form-panel button[type="submit"]:hover {
           transform: translateY(-2px) !important;
           box-shadow: 0 12px 24px -10px rgba(16,185,129,0.5) !important;
           filter: brightness(1.1) !important;
        }
        /* Google / Outline button — dark styled */
        .auth-form-panel .btn-google {
          background: rgba(255,255,255,0.04) !important;
          border-color: rgba(255,255,255,0.06) !important;
          color: rgba(255,255,255,0.9) !important;
          border-radius: 12px !important;
          height: 3.25rem !important;
          transition: all 0.2s ease !important;
        }
        .auth-form-panel .btn-google:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.1) !important;
          transform: translateY(-1px) !important;
        }
      `}</style>

      <div className="auth-form-panel relative z-10 w-full max-w-sm transition-all duration-1000 animate-in fade-in slide-in-from-bottom-8">
        {children}
      </div>
    </main>
  );
}
