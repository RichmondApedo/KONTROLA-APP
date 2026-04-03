'use client';

import React, { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { cn } from '@/lib/utils';
import { ChevronRight, Download, Share2, Play, Pause, Smartphone, ShieldCheck, Zap } from 'lucide-react';
import Image from 'next/image';

const OFFICIAL_LOGO = "/App icons/Kontrola_Desktop_512x512.png";

const SCENES = [
  {
    id: 'intro',
    image: '/promo/scene-1.png',
    title: 'THE EXECUTIVE STANDARD',
    subtitle: 'Strategic Financial Intelligence for Leaders',
    description: 'Transform your financial landscape from tracking to strategy.',
    accent: 'from-blue-600/20 to-indigo-600/20',
  },
  {
    id: 'business',
    image: '/promo/scene-2.png',
    title: 'EXECUTIVE BUSINESS SUITE',
    subtitle: 'Precision Invoicing & Portfolio Mapping',
    description: 'Professional grade tools for managing your capital flow with absolute clarity.',
    accent: 'from-emerald-600/20 to-teal-600/20',
  },
  {
    id: 'vehicle',
    image: '/promo/scene-3.png',
    title: 'VEHICLE INTELLIGENCE',
    subtitle: 'Predictive Analytics & Telematics',
    description: 'Know exactly when to refuel with our proprietary AI prediction engine.',
    accent: 'from-orange-600/20 to-amber-600/20',
  },
  {
    id: 'ai',
    image: '/promo/scene-4.png',
    title: 'AI ADVISOR',
    subtitle: 'Financial Maturity & Strategic Insights',
    description: 'Personalized data-driven advice to optimize your savings and liquidity.',
    accent: 'from-purple-600/20 to-pink-600/20',
  },
  {
    id: 'outro',
    image: '/promo/scene-1.png',
    title: 'TAKE COMMAND',
    subtitle: 'Download KONTROLA Today',
    description: 'Available on iOS and Android. Experience the future of financial command.',
    accent: 'from-blue-600/20 to-indigo-600/20',
    isOutro: true,
  }
];

export function PromoVideo() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 40, skipSnaps: false }, [
    Autoplay({ delay: 6000, stopOnInteraction: false })
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!emblaApi) return;
    
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };
    
    emblaApi.on('select', onSelect);
    onSelect();
    
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  const toggleAutoplay = () => {
    const autoplay = emblaApi?.plugins()?.autoplay;
    if (!autoplay) return;

    if (isPlaying) {
      autoplay.stop();
    } else {
      autoplay.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      {/* Background Cinematic Gradients */}
      <div className={cn(
        "absolute inset-0 transition-all duration-1000 ease-in-out opacity-40 bg-gradient-to-br",
        SCENES[selectedIndex].accent
      )} />
      
      {/* Main Carousel */}
      <div className="embla h-full overflow-hidden" ref={emblaRef}>
        <div className="embla__container h-full flex">
          {SCENES.map((scene, index) => (
            <div key={scene.id} className="embla__slide flex-[0_0_100%] h-full relative">
              {/* Scene Image with Animation */}
              <div className="absolute inset-0 flex items-center justify-center p-8 md:p-24 overflow-hidden">
                <div className={cn(
                  "relative w-full max-w-5xl aspect-video transition-all duration-[3000ms] cubic-bezier(0.16, 1, 0.3, 1)",
                  selectedIndex === index ? "scale-105 opacity-100 translate-y-0" : "scale-100 opacity-0 translate-y-8"
                )}>
                  <Image 
                    src={scene.image} 
                    alt={scene.title}
                    fill
                    className="object-cover rounded-2xl shadow-2xl border border-white/10"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-2xl" />
                </div>
              </div>

              {/* Text Overlays */}
              <div className="absolute inset-0 flex flex-col justify-end p-12 md:p-24 pointer-events-none">
                <div className={cn(
                  "max-w-3xl space-y-4 transition-all duration-1000 delay-500",
                  selectedIndex === index ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                )}>
                  <div className="flex items-center gap-3">
                    <div className="h-[2px] w-12 bg-primary animate-pulse" />
                    <span className="text-primary font-bold tracking-[0.2em] text-sm uppercase">
                      {scene.title}
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-7xl font-bold text-white tracking-tight leading-tight">
                    {scene.subtitle}
                  </h2>
                  <p className="text-lg md:text-2xl text-slate-400 font-light max-w-2xl leading-relaxed">
                    {scene.description}
                  </p>
                  
                  <div className="flex items-center gap-6 pt-8 pointer-events-auto">
                      <button className="px-8 py-4 bg-white text-black rounded-full font-bold flex items-center gap-2 hover:bg-slate-200 transition-all transform hover:scale-105">
                        <Smartphone className="w-5 h-5" />
                        Download Now
                      </button>
                      <div className="flex items-center gap-4 opacity-80 bg-white/10 p-2 px-4 rounded-xl backdrop-blur-sm transform-gpu border border-white/10">
                        <Image src={OFFICIAL_LOGO} alt="KONTROLA Official Logo" width={32} height={32} className="rounded-lg shadow-lg" />
                        <span className="text-white font-bold tracking-tight">KONTROLA</span>
                      </div>
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bars */}
      <div className="absolute top-12 left-12 right-12 flex gap-2 z-50">
        {SCENES.map((_, index) => (
          <div key={index} className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full bg-primary transition-all rounded-full",
                selectedIndex === index ? "w-full duration-[6000ms] ease-linear" : index < selectedIndex ? "w-full duration-0" : "w-0 duration-0"
              )} 
            />
          </div>
        ))}
      </div>

      {/* Navigation & Controls */}
      <div className="absolute bottom-12 right-12 flex items-center gap-4 z-50">
        <button 
          onClick={toggleAutoplay}
          className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md transform-gpu rounded-full border border-white/10 transition-all text-white"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
        </button>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md transform-gpu px-4 py-2 rounded-full border border-white/10 text-white font-mono text-sm">
          <span>{String(selectedIndex + 1).padStart(2, '0')}</span>
          <span className="opacity-40">/</span>
          <span className="opacity-40">{String(SCENES.length).padStart(2, '0')}</span>
        </div>
      </div>

      {/* Intro Branding (Floating) */}
      <div className="absolute top-12 left-12 z-50 flex items-center gap-4 group">
        <div className="relative w-12 h-12 overflow-hidden rounded-xl border border-white/20 shadow-2xl transition-transform group-hover:scale-110">
          <Image src={OFFICIAL_LOGO} alt="KONTROLA" fill className="object-cover" />
        </div>
        <span className="text-2xl font-bold text-white tracking-tight drop-shadow-md">KONTROLA</span>
      </div>

      {/* Screen Recording Helper Overlay (Optional, for the user) */}
      <div className="absolute top-4 right-4 text-[10px] text-white/20 pointer-events-none uppercase tracking-widest">
        1080p Cinematic Stream • {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
