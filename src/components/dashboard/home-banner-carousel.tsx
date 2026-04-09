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
            <div className="relative h-[200px] xs:h-[260px] md:h-[320px] lg:h-[380px] w-full overflow-hidden rounded-2xl shadow-lg border border-border/50">
              <Image
                src={banner.imageUrl}
                alt={banner.subtitle || banner.title}
                fill
                priority={index === 0}
                className="object-cover object-top"
              />
              {/* Subtle bottom vignette only — images already contain their own text */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent rounded-b-2xl" />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
