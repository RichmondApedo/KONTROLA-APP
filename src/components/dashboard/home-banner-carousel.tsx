'use client';

import React from 'react';
import Image from 'next/image';
import Autoplay from 'embla-carousel-autoplay';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import type { HomeBanner } from '@/lib/types';
import bannerData from '@/lib/banner-data.json';

const activeBanners: HomeBanner[] = bannerData.defaultBanners.filter(b => b.active);

export function HomeBannerCarousel() {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  if (!activeBanners || activeBanners.length === 0) {
    return null;
  }

  return (
    <Carousel
      plugins={[plugin.current]}
      className="w-full"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
      opts={{
        loop: true,
      }}
    >
      <CarouselContent>
        {activeBanners.map((banner, index) => (
          <CarouselItem key={banner.id}>
            <div className="relative h-[220px] md:h-[280px] lg:h-[320px] w-full overflow-hidden rounded-2xl shadow-lg border border-border/50">
              <Image
                src={banner.imageUrl}
                alt={banner.subtitle || banner.title}
                fill
                priority={index === 0}
                className="object-cover object-center"
              />
              {/* Strong gradient so overlay text is always readable */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10" />
              <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 lg:p-10">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1.5 drop-shadow-lg leading-tight">{banner.title}</h2>
                <p className="text-xs sm:text-sm lg:text-base text-gray-200 line-clamp-2 max-w-xl drop-shadow-md font-medium">{banner.subtitle}</p>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
