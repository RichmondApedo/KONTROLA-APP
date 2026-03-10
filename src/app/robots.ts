import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://kontrola.app' // IMPORTANT: Replace with your actual domain
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/admin/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
