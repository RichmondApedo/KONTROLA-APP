'use client';

import { useMemo, useState, useEffect } from 'react';
import type { HomeBanner } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import bannerData from '@/lib/banner-data.json';

const defaultBanners: HomeBanner[] = bannerData.defaultBanners;

export function HomeBannerCarousel() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This just prevents a flash of content and ensures client-side rendering
    setIsLoading(false);
  }, []);
  
  const firstBanner = useMemo(() => {
    // Get only the first active banner
    return defaultBanners.find(b => b.active);
  }, []);

  if (isLoading) {
    return (
        <div className="h-[220px] w-full">
            <Skeleton className="h-full w-full rounded-2xl" />
        </div>
    );
  }

  if (!firstBanner) {
    // Don't render anything if there are no active banners
    return null;
  }

  return (
    <div
      className="relative h-[220px] rounded-2xl bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: `url(${firstBanner.imageUrl})` }}
    >
      {firstBanner.title && (
        <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/60 to-transparent">
          <h2 className="text-white text-2xl font-bold mb-1">{firstBanner.title}</h2>
          <p className="text-gray-200 text-sm">{firstBanner.subtitle}</p>
        </div>
      )}
    </div>
  );
}
