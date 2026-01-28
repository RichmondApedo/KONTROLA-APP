'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import type { HomeBanner } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';

export function HomeBannerCarousel() {
  const firestore = useFirestore();

  // Query all banners and order them, then filter for active ones on the client.
  // This avoids a composite index on `active` and `order` which may not exist.
  const bannersQuery = useMemo(
    () =>
      firestore
        ? query(
            collection(firestore, 'home_banners'),
            orderBy('order')
          )
        : null,
    [firestore]
  );

  const { data: allBanners, isLoading } = useCollection<HomeBanner>(bannersQuery);

  const banners = useMemo(() => {
    if (!allBanners) return null;
    return allBanners.filter(banner => banner.active);
  }, [allBanners]);


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
    <Swiper
      modules={[Autoplay]}
      autoplay={{ delay: 4000, disableOnInteraction: false }}
      spaceBetween={16}
      slidesPerView={1.1}
      centeredSlides
      loop={banners.length > 1}
      className="!pb-4"
    >
      {banners.map((banner) => (
        <SwiperSlide key={banner.id}>
          <div
            className="relative h-[220px] rounded-2xl bg-cover bg-center overflow-hidden"
            style={{ backgroundImage: `url(${banner.imageUrl})` }}
          >
            <div className="absolute inset-0 p-5 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent">
              <h2 className="text-white text-2xl font-bold mb-1">{banner.title}</h2>
              <p className="text-gray-200 text-sm">{banner.subtitle}</p>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
