export const dynamic = 'force-static';
import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://kontrolaapp.com' 
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/pricing', '/auth/login', '/auth/register'],
      disallow: ['/api/', '/dashboard/', '/settings/', '/admin/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
