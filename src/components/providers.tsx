'use client';

import { useEffect } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' &&
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker
        .getRegistrations()
        .then(registrations => {
          for (const registration of registrations) {
            registration.unregister();
          }
        })
        .catch(err => {
          console.error('Service worker unregistration failed: ', err);
        });
    }
  }, []);
  
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      themes={['light', 'dark', 'system', 'ocean', 'sunset']}
    >
      <FirebaseClientProvider>{children}</FirebaseClientProvider>
      <Toaster />
    </ThemeProvider>
  );
}
