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
        src: '/App icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/App icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  }
}
