import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { PWAInstallPrompt } from '@/components/dashboard/pwa-install-prompt';
// import { Poppins, PT_Sans } from 'next/font/google';

/*
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
*/

const APP_NAME = "KONTROLA";
const APP_DESCRIPTION = "The comprehensive Financial Planning and Management platform for modern enterprises and Ghanaian SMEs. Automate WhatsApp billing, monitor cash flow, and achieve financial mastery with executive-grade insights.";

export const metadata: Metadata = {
  metadataBase: new URL('https://kontrolaapp.com'),
  title: {
    default: `${APP_NAME} | Financial Planning and Management`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    'Liquidity Intelligence',
    'SME Cash Flow Management',
    'WhatsApp Billing Automation',
    'Financial Planning and Management',
    'Ghanaian Fintech',
    'Business Intelligence Terminal',
    'Financial Planning and Management Suite',
    'Accra Business Software',
    'Expense Management Automation',
    'Cash Flow Forecasting',
  ],
  authors: [{ name: 'KONTROLA Team' }],
  creator: 'KONTROLA',
  publisher: 'KONTROLA',
  category: 'finance',
  
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: APP_NAME,
    startupImage: [
      { url: '/icon.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
    ],
  },
  
  formatDetection: {
    telephone: false,
  },
  
  openGraph: {
    type: 'website',
    url: 'https://kontrolaapp.com',
    title: `${APP_NAME} | Financial Planning and Management`,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    locale: 'en_GH',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'KONTROLA Strategic Intelligence Banner',
    }],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} | Financial Planning and Management`,
    description: APP_DESCRIPTION,
    site: '@kontrolaapp',
    creator: '@kontrolaapp',
    images: ['/og-image.png'],
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": APP_NAME,
      "operatingSystem": "WEB",
      "applicationCategory": "FinanceApplication",
      "description": APP_DESCRIPTION,
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "2850"
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "GHS"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "KONTROLA",
      "url": "https://kontrolaapp.com",
      "logo": "https://kontrolaapp.com/icon.png",
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "support@kontrolaapp.com",
        "contactType": "customer service"
      },
      "sameAs": [
        "https://twitter.com/kontrolaapp",
        "https://facebook.com/kontrola.app",
        "https://instagram.com/kontrola.app"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "KONTROLA",
      "url": "https://kontrolaapp.com",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://kontrolaapp.com/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  ];

  return (
    <html lang="en" suppressHydrationWarning>
       <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
      </head>
      <body className="font-body antialiased">
        <Providers>
            {children}
            <PWAInstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
