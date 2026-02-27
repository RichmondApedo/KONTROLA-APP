import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'KONTROLA',
  description: 'AI-powered financial management app.',
  manifest: '/manifest.json',
  applicationName: 'KONTROLA',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KONTROLA',
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: '#16a34a',
  icons: [
    {
      rel: 'icon',
      url: '/App icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      rel: 'icon',
      url: '/App icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
    {
      rel: 'apple-touch-icon',
      url: '/App icons/apple-icon-180x180.png',
      sizes: '180x180',
      type: 'image/png',
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
