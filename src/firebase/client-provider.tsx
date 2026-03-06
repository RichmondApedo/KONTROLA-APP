'use client';

import React, { useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth, getRedirectResult } from 'firebase/auth';
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
  const { toast } = useToast();
  const [isHandlingRedirect, setIsHandlingRedirect] = useState(true);

  useEffect(() => {
    try {
      // This effect runs only once on the client, ensuring Firebase is initialized once.
      const firebaseServices = initializeFirebase();
      setServices(firebaseServices);
      
      getRedirectResult(firebaseServices.auth)
        .then((result) => {
          if (result) {
            toast({ title: 'Sign-In Successful!', description: 'Welcome back!' });
          }
        })
        .catch((error) => {
          console.error('Sign-in redirect error:', error);
          toast({
            variant: 'destructive',
            title: 'Sign-In Failed',
            description: error.message || 'An unknown error occurred during sign-in.',
          });
        })
        .finally(() => {
          setIsHandlingRedirect(false);
        });

    } catch (e: any) {
      console.error("Failed to initialize Firebase:", e);
      setInitializationError(e);
      setIsHandlingRedirect(false);
    }
  }, [toast]);

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
