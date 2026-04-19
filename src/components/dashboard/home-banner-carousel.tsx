'use client';

import React from 'react';
import Image from 'next/image';
import Autoplay from 'embla-carousel-autoplay';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from '@/components/ui/carousel';
import type { HomeBanner } from '@/lib/types';
import bannerData from '@/lib/banner-data.json';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ClientOnly } from '@/components/client-only';

const activeBanners: HomeBanner[] = bannerData.defaultBanners.filter(b => b.active);

export function HomeBannerCarousel() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);
  const [loadedImages, setLoadedImages] = React.useState<Record<string, boolean>>({});
  
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  React.useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  if (!activeBanners || activeBanners.length === 0) {
    return null;
  }

  return (
    <ClientOnly>
      <div className="relative group/carousel">
        <Carousel
          setApi={setApi}
          plugins={[plugin.current]}
          className="w-full"
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
          opts={{
            loop: true,
          }}
        >
          <CarouselContent className="-ml-0">
            {activeBanners.map((banner, index) => (
              <CarouselItem key={banner.id} className="pl-0">
                <div className="relative h-[340px] min-[380px]:h-[380px] min-[440px]:h-[420px] xs:h-[450px] md:h-[350px] lg:h-[400px] xl:h-[480px] 2xl:h-[520px] w-full overflow-hidden rounded-none shadow-2xl border-b border-border/10 transition-all duration-700 bg-muted">
                  {/* Skeleton Loader */}
                  {!loadedImages[banner.id] && (
                    <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
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
                    sizes="100vw"
                  />
                  
                  {/* Premium Gradient Overlay (Softer & Deeper) */}
                  <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 via-black/20 to-transparent rounded-none" />
                  
                  {/* Accessibility Branding (Visible on Hover) */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mb-4">{banner.title}</p>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {/* Desktop Navigation Arrows (Minimal Glassmorphism) */}
          <div className="hidden md:block">
            <CarouselPrevious className="left-8 h-12 w-12 border-white/10 bg-black/20 text-white backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:bg-black/40 hover:scale-110" />
            <CarouselNext className="right-8 h-12 w-12 border-white/10 bg-black/20 text-white backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:bg-black/40 hover:scale-110" />
          </div>
        </Carousel>

        {/* Dot Navigation Indicators */}
        {count > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-20 pointer-events-none sm:bottom-10">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500 pointer-events-auto",
                  i === current 
                    ? "w-10 bg-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.6)]" 
                    : "w-2.5 bg-white/20 hover:bg-white/40"
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </ClientOnly>
  );
}
