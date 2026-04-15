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
            <div className="relative h-[200px] min-[380px]:h-[240px] xs:h-[300px] md:h-[320px] lg:h-[380px] xl:h-[420px] 2xl:h-[450px] w-full overflow-hidden rounded-none sm:rounded-[2.5rem] shadow-2xl border-b sm:border border-border/50 group transition-all duration-700 hover:shadow-primary/5">
              <Image
                src={banner.imageUrl}
                alt={banner.subtitle || banner.title}
                fill
                priority={index === 0}
                className="object-cover object-center transition-transform duration-1000 group-hover:scale-105"
              />
              {/* Premium Gradient Overlay — images already contain their own text */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-b-[2.5rem]" />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
