'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import type { HomeBanner } from '@/lib/types';
import bannerData from '@/lib/banner-data.json';

const defaultBanners: HomeBanner[] = bannerData.defaultBanners;

export function HomeBannerCarousel() {
  const firstBanner = useMemo(() => {
    // Get only the first active banner
    return defaultBanners.find(b => b.active);
  }, []);

  if (!firstBanner) {
    // Don't render anything if there are no active banners
    return null;
  }

  return (
    <div
      className="relative h-[220px] w-full overflow-hidden rounded-2xl"
    >
      <Image
        src={firstBanner.imageUrl}
        alt={firstBanner.subtitle || firstBanner.title}
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-6">
        <h2 className="text-2xl font-bold text-white">{firstBanner.title}</h2>
        <p className="text-sm text-gray-200">{firstBanner.subtitle}</p>
      </div>
    </div>
  );
}
