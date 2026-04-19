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
          <CarouselContent className="ml-0">
            {activeBanners.map((banner, index) => (
              <CarouselItem key={banner.id} className="pl-0 basis-full">
                <div className="relative aspect-[16/9] xs:aspect-[1.8/1] md:h-[350px] lg:h-[400px] xl:h-[480px] 2xl:h-[520px] w-full overflow-hidden rounded-none shadow-2xl border-0 transition-all duration-700 bg-muted">
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
                    sizes="(max-width: 768px) 100vw, 100vw"
                  />
                  
                  {/* Premium Gradient Overlay (Deeper for Mobile Legibility) */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  
                  {/* System Insight Glass Badge */}
                  <div className="absolute top-6 left-6 z-10 animate-in fade-in slide-in-from-left-4 duration-1000 delay-300">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/20 backdrop-blur-md border border-white/10 shadow-lg">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/90">System Insight</p>
                      </div>
                  </div>

                  {/* High-Fidelity Title Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-12 transition-all duration-500">
                      <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter leading-tight drop-shadow-2xl">
                          {banner.title}
                      </h2>
                      <p className="text-white/70 text-xs sm:text-lg font-medium tracking-tight mt-1 max-w-md line-clamp-2">
                          {banner.subtitle || "Exploring the potential of your financial trajectory."}
                      </p>
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

        {/* Glassmorphism Pill Dot Indicators */}
        {count > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-20 p-2 rounded-full bg-black/20 backdrop-blur-md border border-white/5 shadow-2xl transition-all duration-500 sm:bottom-10">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  i === current 
                    ? "w-8 bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)]" 
                    : "w-1.5 bg-white/30 hover:bg-white/50"
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
