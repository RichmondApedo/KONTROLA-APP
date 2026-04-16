export const dynamic = 'force-static';
import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KONTROLA | Strategic Financial Suite',
    short_name: 'KONTROLA',
    description: 'The Strategic Liquidity Intelligence Terminal for modern enterprises and Ghanaian SMEs.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020817',
    theme_color: '#10B981',
    categories: ['finance', 'business', 'productivity'],
    lang: 'en-US',
    dir: 'ltr',
    orientation: 'portrait',
    shortcuts: [
      {
        name: 'Log Expense',
        short_name: 'Expense',
        description: 'Record a new business expense',
        url: '/dashboard/expenses',
        icons: [{ src: '/icon.png', sizes: '192x192' }]
      },
      {
        name: 'Generate Invoice',
        short_name: 'Invoice',
        description: 'Create a new client invoice',
        url: '/dashboard/invoices',
        icons: [{ src: '/icon.png', sizes: '192x192' }]
      },
      {
        name: 'View Reports',
        short_name: 'Reports',
        description: 'View financial intelligence reports',
        url: '/dashboard/reports',
        icons: [{ src: '/icon.png', sizes: '192x192' }]
      }
    ],
    icons: [
      {
        src: '/App%20icons/Kontrola_GooglePlay_512x512.png?v=7',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/App%20icons/Kontrola_GooglePlay_512x512.png?v=7',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/App%20icons/Kontrola_Apple_1024x1024.png?v=7',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
