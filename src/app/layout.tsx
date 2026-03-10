import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Poppins, PT_Sans } from 'next/font/google';

const fontPoppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['400', '600', '700'],
});

const fontPtSans = PT_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pt-sans',
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'KONTROLA',
    template: '%s | KONTROLA',
  },
  description: 'AI-powered financial management app.',
  applicationName: 'KONTROLA',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KONTROLA',
    startupImage: [
      // iPhones
      { url: 'https://picsum.photos/seed/splash1/828/1792.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: 'https://picsum.photos/seed/splash2/1242/2688.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: 'https://picsum.photos/seed/splash3/750/1334.png', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      // iPads
      { url: 'https://picsum.photos/seed/splash4/2048/2732.png', media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
    ],
  },
  formatDetection: {
    telephone: false,
  },
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

export const viewport: Viewport = {
  themeColor: '#020817',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fontPoppins.variable} ${fontPtSans.variable}`}>
      <body className="font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
