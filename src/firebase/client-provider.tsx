'use client';

import React, { useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/init';
import { FirebaseProvider } from '@/firebase/provider';
import { Logo } from '@/components/logo';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { AuthLoading } from '@/components/auth/auth-loading';

interface FirebaseClientProviderProps {
  children: React.ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [services, setServices] = useState<{
    firebaseApp: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
  } | null>(null);
  const [initializationError, setInitializationError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      // This effect runs only once on the client, ensuring Firebase is initialized once.
      const firebaseServices = initializeFirebase();
      setServices(firebaseServices);

      // Register PWA Service Worker
      if ('serviceWorker' in navigator) {
        const register = () => {
          navigator.serviceWorker.register('/sw.js').then(
            (registration) => {
              console.log('PWA ServiceWorker registration successful with scope: ', registration.scope);
            },
            (err) => {
              console.log('PWA ServiceWorker registration failed: ', err);
            }
          );
        };

        if (document.readyState === 'complete') {
          register();
        } else {
          window.addEventListener('load', register);
          return () => window.removeEventListener('load', register);
        }
      }
    } catch (e: any) {
      console.error("Failed to initialize Firebase:", e);
      setInitializationError(e);
    }
  }, []);

  if (initializationError) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4">
        <Logo />
        <div className="flex flex-col items-center gap-2 text-destructive">
          <p>Failed to connect to Firebase services.</p>
          <p className="text-sm text-muted-foreground">{initializationError.message}</p>
        </div>
      </div>
    );
  }

  if (!services) {
    return (
      <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#0a0a0f] p-4 overflow-hidden">
        <div className="relative z-10 w-full max-w-xs transition-all duration-700">
          <AuthLoading message="Connecting to services..." />
        </div>
      </main>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
