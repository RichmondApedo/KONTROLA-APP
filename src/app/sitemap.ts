import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://kontrola.app' // IMPORTANT: Replace with your actual domain

  // Static pages
  const staticRoutes = [
    '', 
    '/pricing', 
    '/auth/login', 
    '/auth/signup', 
    '/terms-of-service', 
    '/privacy-policy'
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }));
  
  // Dashboard pages
  const dashboardRoutes = [
      '/dashboard',
      '/dashboard/income',
      '/dashboard/expenses',
      '/dashboard/business',
      '/dashboard/budget',
      '/dashboard/bills',
      '/dashboard/goals',
      '/dashboard/reports',
      '/dashboard/score',
      '/dashboard/advisor',
      '/dashboard/settings',
      '/dashboard/help',
      '/dashboard/admin'
  ].map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7
  }));

  return [...staticRoutes, ...dashboardRoutes];
}
