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

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ClientOnly } from '@/components/client-only';

const activeBanners: HomeBanner[] = bannerData.defaultBanners.filter(b => b.active);

export function HomeBannerCarousel() {
  const [loadedImages, setLoadedImages] = React.useState<Record<string, boolean>>({});
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  if (!activeBanners || activeBanners.length === 0) {
    return null;
  }

  return (
    <ClientOnly>
      <Carousel
        plugins={[plugin.current]}
        className="w-full h-full"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
        opts={{
          loop: true,
        }}
      >
        <CarouselContent>
          {activeBanners.map((banner, index) => (
            <CarouselItem key={banner.id}>
              <div className="relative h-[200px] min-[380px]:h-[240px] xs:h-[300px] md:h-[320px] lg:h-[380px] xl:h-[420px] 2xl:h-[450px] w-full overflow-hidden rounded-none sm:rounded-[2.5rem] shadow-2xl border-b sm:border border-border/50 group transition-all duration-700 hover:shadow-primary/5 bg-muted">
                {/* Skeleton Loader - hidden when image is loaded */}
                {!loadedImages[banner.id] && (
                  <Skeleton className="absolute inset-0 h-full w-full rounded-none sm:rounded-[2.5rem]" />
                )}
                
                <Image
                  src={banner.imageUrl}
                  alt={banner.subtitle || banner.title}
                  fill
                  priority={index === 0}
                  onLoad={() => setLoadedImages(prev => ({ ...prev, [banner.id]: true }))}
                  className={cn(
                    "object-cover object-center transition-all duration-1000 group-hover:scale-105",
                    loadedImages[banner.id] ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-lg scale-110"
                  )}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1600px"
                />
                {/* Premium Gradient Overlay — images already contain their own text */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-b-none sm:rounded-b-[2.5rem]" />
                
                {/* Optional: Subtle Overlay Text if needed for accessibility or branding */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">{banner.title}</p>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </ClientOnly>
  );
}
