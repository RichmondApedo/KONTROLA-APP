export const dynamic = 'force-static';
import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://kontrolaapp.com' 

  // Static pages (Public Marketing)
  const routes = [
    { url: '', priority: 1.0, changeFrequency: 'daily' as const },
    { url: '/pricing', priority: 0.9, changeFrequency: 'weekly' as const },
    { url: '/auth/login', priority: 0.7, changeFrequency: 'monthly' as const },
    { url: '/auth/register', priority: 0.7, changeFrequency: 'monthly' as const },
    { url: '/terms-of-service', priority: 0.3, changeFrequency: 'monthly' as const },
    { url: '/privacy-policy', priority: 0.3, changeFrequency: 'monthly' as const },
  ].map((route) => ({
    url: `${baseUrl}${route.url}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
  
  return [...routes];
}
