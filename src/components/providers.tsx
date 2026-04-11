'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
      themes={['light', 'dark', 'system', 'ocean', 'sunset']}
    >
      <FirebaseClientProvider>{children}</FirebaseClientProvider>
      <Toaster />
    </ThemeProvider>
  );
}
