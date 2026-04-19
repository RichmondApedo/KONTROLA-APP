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
    Autoplay({ delay: 6000, stopOnInteraction: true })
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
      <div className="relative group/carousel w-full">
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
                <div className="relative h-[48vh] lg:h-[400px] xl:h-[480px] 2xl:h-[520px] w-full overflow-hidden bg-black transition-all duration-700 rounded-b-[2.5rem] lg:rounded-3xl shadow-2xl border-0 lg:border lg:border-white/5">
                  {/* High-Fidelity Skeleton with Premium Shimmer */}
                  {!loadedImages[banner.id] && (
                    <Skeleton className="absolute inset-0 h-full w-full bg-muted/20 animate-pulse" />
                  )}
                  
                  {/* Parallax Background Layer */}
                  <div className="absolute inset-0 transition-transform duration-[2s] ease-out group-hover:scale-110">
                    <Image
                        src={banner.imageUrl}
                        alt={banner.subtitle || banner.title}
                        fill
                        priority={index === 0}
                        onLoad={() => setLoadedImages(prev => ({ ...prev, [banner.id]: true }))}
                        className={cn(
                        "object-cover object-center transition-all duration-1000",
                        loadedImages[banner.id] ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-xl scale-110"
                        )}
                        sizes="100vw"
                    />
                  </div>
                  
                  {/* Immersive Depth Vignettes (Top & Bottom Grounding) */}
                  <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 via-black/20 to-transparent z-[1]" />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-[1]" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20 z-[1]" />
                  
                  {/* System Intelligence Badge (Hardware-Aware Safe Area) */}
                  <div 
                    className="absolute left-4 sm:left-10 z-10 animate-in fade-in slide-in-from-left-8 duration-700 delay-500"
                    style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
                  >
                      <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden group/badge">
                          <div className="relative h-2 w-2">
                            <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
                            <div className="relative h-2 w-2 rounded-full bg-primary" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/90 drop-shadow-md">
                            System Intelligence
                          </p>
                      </div>
                  </div>

                  {/* Specular Glass Footer (Calibrated Vertical Balance) */}
                  <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-12 sm:pb-16 flex flex-col justify-end bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                      <div className="max-w-3xl space-y-2 sm:space-y-4 mb-4 sm:mb-0">
                          <h2 className="text-[clamp(1.5rem,7vw,3.5rem)] font-black text-white tracking-tighter leading-[0.9] drop-shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
                              {banner.title}
                          </h2>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
                              <p className="text-white/80 text-xs sm:text-xl font-medium tracking-tight max-w-xl leading-relaxed line-clamp-2 sm:line-clamp-none">
                                {banner.subtitle || "Exploring the high-fidelity landscape of your financial future."}
                              </p>
                          </div>
                      </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {/* Desktop Navigation (Floating Fluent UI Style) */}
          <div className="hidden md:block">
            <CarouselPrevious className="left-10 h-14 w-14 border-white/20 bg-white/5 text-white backdrop-blur-2xl opacity-0 group-hover/carousel:opacity-100 transition-all duration-500 hover:bg-primary hover:border-primary hover:scale-110" />
            <CarouselNext className="right-10 h-14 w-14 border-white/20 bg-white/5 text-white backdrop-blur-2xl opacity-0 group-hover/carousel:opacity-100 transition-all duration-500 hover:bg-primary hover:border-primary hover:scale-110" />
          </div>
        </Carousel>

        {/* Calibrated Pill Dot Indicators */}
        {count > 1 && (
          <div className="absolute bottom-12 sm:bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20 px-5 py-3 rounded-[2rem] bg-black/20 backdrop-blur-2xl border border-white/5 shadow-[0_15px_35px_rgba(0,0,0,0.3)] transition-all duration-700">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="relative flex items-center justify-center h-full">
                <button
                  onClick={() => api?.scrollTo(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-700",
                    i === current 
                      ? "w-10 bg-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.8)]" 
                      : "w-2 bg-white/30 hover:bg-white/50"
                  )}
                  aria-label={`Go to slide ${i + 1}`}
                />
                {/* 44px Invisible Tap Target (Apple HIG Standard) */}
                <button 
                  onClick={() => api?.scrollTo(i)}
                  className="absolute inset-0 h-[44px] w-[30px] -mt-[14px]"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </ClientOnly>
  );
}
