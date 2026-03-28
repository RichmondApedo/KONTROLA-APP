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

const APP_NAME = "KONTROLA";
const APP_DESCRIPTION = "KONTROLA is an AI-powered financial management app designed to help you track expenses, manage budgets, and achieve your financial goals with personalized insights.";


export const metadata: Metadata = {
  metadataBase: new URL('https://kontrola.app'), // IMPORTANT: Replace with your actual domain
  title: {
    default: `${APP_NAME} - Financial Planning And Management`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    'finance',
    'money management',
    'budgeting',
    'expense tracker',
    'personal finance',
    'AI advisor',
    'savings goals',
    'financial planning',
    'invoicing',
    'business finance',
  ],
  authors: [{ name: 'KONTROLA Team' }],
  creator: 'KONTROLA',
  publisher: 'KONTROLA',
  
  icons: {
    icon: '/App%20icons/Kontrola_GooglePlay_512x512.png',
    apple: '/App%20icons/Kontrola_Apple_1024x1024.jpg%20(1).jpeg',
  },
  
  // PWA and App icon configurations
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: APP_NAME,
    // NOTE FOR PRODUCTION: The startupImage URLs below use a placeholder service.
    // For a production app, you should replace these with static image assets
    // hosted in your `public` folder for faster and more reliable loading.
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
  
  openGraph: {
    type: 'website',
    url: 'https://kontrola.app',
    title: `${APP_NAME} - Financial Planning And Management`,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    images: [{
      url: 'https://i.imgur.com/xKrfcPj.png',
      width: 1200,
      height: 630,
      alt: 'KONTROLA App Banner',
    }],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} - Financial Planning And Management`,
    description: APP_DESCRIPTION,
    images: ['https://i.imgur.com/xKrfcPj.png'],
  },
};


export const viewport: Viewport = {
  themeColor: '#020817',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": APP_NAME,
      "operatingSystem": "WEB",
      "applicationCategory": "FinanceApplication",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "2580"
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "GHS"
      }
  };

  return (
    <html lang="en" suppressHydrationWarning className={`${fontPoppins.variable} ${fontPtSans.variable}`}>
       <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
      </head>
      <body className="font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
