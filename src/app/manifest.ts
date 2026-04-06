export const dynamic = 'force-static';
import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KONTROLA',
    short_name: 'KONTROLA',
    description: 'Executive AI-powered financial management and business intelligence suite.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020817',
    theme_color: '#10B981',
    categories: ['finance', 'business', 'productivity'],
    lang: 'en-US',
    dir: 'ltr',
    orientation: 'portrait',
    icons: [
      {
        src: '/App%20icons/Kontrola_GooglePlay_512x512.png?v=5',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/App%20icons/Kontrola_GooglePlay_512x512.png?v=5',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/App%20icons/Kontrola_Desktop_512x512.png?v=5',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/App%20icons/Kontrola_Apple_1024x1024.png?v=5',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
