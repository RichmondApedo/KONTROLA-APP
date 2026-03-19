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
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4">
        <div className="flex w-full max-w-xs flex-col items-center gap-6 text-center">
            <Logo />
            <div className="w-full">
                <p className="animate-pulse mb-2 text-muted-foreground">Connecting to services...</p>
                <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div className="absolute h-full animate-loading-bar bg-primary"></div>
                </div>
            </div>
        </div>
      </div>
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
