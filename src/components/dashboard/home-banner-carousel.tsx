'use client';

import { useMemo, useState, useEffect } from 'react';
import type { HomeBanner } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import bannerData from '@/lib/banner-data.json';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import Image from 'next/image';

const defaultBanners: HomeBanner[] = bannerData.defaultBanners;

export function HomeBannerCarousel() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This just prevents a flash of content and ensures client-side rendering
    setIsLoading(false);
  }, []);
  
  const banners = useMemo(() => {
    // Only use the banners from the local JSON file
    return defaultBanners.filter(b => b.active);
  }, []);


  if (isLoading) {
    return (
        <div className="h-[220px] w-full">
            <Skeleton className="h-full w-full rounded-2xl" />
        </div>
    );
  }

  if (!banners || banners.length === 0) {
    // Don't render anything if there are no banners to show
    return null;
  }

  return (
    <Carousel
      className="w-full"
      plugins={[
        Autoplay({
          delay: 4000,
          stopOnInteraction: false,
          stopOnMouseEnter: true,
        }),
      ]}
      opts={{
        loop: banners.length > 1,
      }}
    >
      <CarouselContent>
        {banners.map((banner) => (
          <CarouselItem key={banner.id}>
            <div
              className="relative h-[220px] rounded-2xl bg-cover bg-center overflow-hidden"
            >
              <Image
                src={banner.imageUrl}
                alt={banner.title || 'Banner image'}
                fill
                className="object-cover"
                data-ai-hint={banner.imageHint || 'finance abstract'}
              />
              {banner.title && (
                <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/60 to-transparent">
                  <h2 className="text-white text-2xl font-bold mb-1">{banner.title}</h2>
                  <p className="text-gray-200 text-sm">{banner.subtitle}</p>
                </div>
              )}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
