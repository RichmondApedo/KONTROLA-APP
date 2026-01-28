'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import type { HomeBanner } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';

const defaultBanners: HomeBanner[] = [
    {
      id: 'banner-features',
      title: '', // Text is in the image
      subtitle: '', // Text is in the image
      imageUrl: 'https://picsum.photos/seed/new-banner-upload/1200/400',
      active: true,
      order: 1,
    },
    {
      id: 'banner-welcome',
      title: 'Welcome to Kontrola',
      subtitle: 'Take Control of Your Money',
      imageUrl: 'https://picsum.photos/seed/kontrola/1200/400',
      active: true,
      order: 2,
    },
];


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
    // If loading, we don't have data yet.
    if (isLoading) return null;

    // If we have banners from Firestore, filter for the active ones.
    if (allBanners && allBanners.length > 0) {
      const activeBanners = allBanners.filter(banner => banner.active);
      // If there are active banners from Firestore, show them. Otherwise show nothing.
      return activeBanners.length > 0 ? activeBanners : null;
    }
    
    // If there's no data from Firestore and we are not loading, show the default banners.
    return defaultBanners;
  }, [allBanners, isLoading]);


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
      loop={banners.length > 1}
      className="w-full"
      slidesPerView={1.1}
      spaceBetween={16}
      centeredSlides={true}
      breakpoints={{
        // on screens 1024px and up, override the defaults
        1024: {
            slidesPerView: 1,
            spaceBetween: 0,
            centeredSlides: false,
        },
      }}
    >
      {banners.map((banner) => (
        <SwiperSlide key={banner.id}>
          <div
            className="relative h-[220px] rounded-2xl bg-cover bg-center overflow-hidden"
            style={{ backgroundImage: `url(${banner.imageUrl})` }}
          >
             {banner.title && (
                <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/60 to-transparent">
                    <h2 className="text-white text-2xl font-bold mb-1">{banner.title}</h2>
                    <p className="text-gray-200 text-sm">{banner.subtitle}</p>
                </div>
             )}
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
