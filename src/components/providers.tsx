'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      themes={['light', 'dark', 'system', 'ocean', 'sunset']}
    >
      <FirebaseProvider>{children}</FirebaseProvider>
      <Toaster />
    </ThemeProvider>
  );
}
