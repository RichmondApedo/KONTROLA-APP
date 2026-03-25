import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KONTROLA',
    short_name: 'KONTROLA',
    description: 'AI-powered financial management app.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020817',
    theme_color: '#10B981',
    icons: [
      {
        src: '/App%20icons/Kontrola_GooglePlay_512x512.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/App%20icons/Kontrola_GooglePlay_512x512.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/App%20icons/Kontrola_Desktop_512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/App%20icons/Kontrola_Desktop_512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
