export const dynamic = 'force-static';
import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://kontrola.app' // IMPORTANT: Replace with your actual domain

  // Static pages (Public Marketing)
  const staticRoutes = [
    '', 
    '/pricing', 
    '/auth/login', 
    '/auth/register', 
    '/terms-of-service', 
    '/privacy-policy'
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));
  
  return [...staticRoutes];
}
