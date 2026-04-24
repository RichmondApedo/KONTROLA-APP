'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';

import { PeriodProvider } from '@/components/period-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
      themes={['light', 'dark', 'system', 'ocean', 'sunset']}
    >
      <FirebaseClientProvider>
        <PeriodProvider>
          {children}
        </PeriodProvider>
      </FirebaseClientProvider>
      <Toaster />
    </ThemeProvider>
  );
}
