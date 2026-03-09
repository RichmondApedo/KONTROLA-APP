'use client';

import React, { useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/init';
import { FirebaseProvider } from '@/firebase/provider';
import { Logo } from '@/components/logo';
import { Loader2 } from 'lucide-react';
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
  const [isHandlingRedirect, setIsHandlingRedirect] = useState(false);

  useEffect(() => {
    try {
      // This effect runs only once on the client, ensuring Firebase is initialized once.
      const firebaseServices = initializeFirebase();
      setServices(firebaseServices);
      // Since we are using popup-based sign-in, the redirect result check is no longer needed.
      // This simplifies the initial loading state.
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

  if (!services || isHandlingRedirect) {
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
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
