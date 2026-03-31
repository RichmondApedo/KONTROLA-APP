import { PromoVideo } from '@/components/promo/promo-video';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KONTROLA | The Executive Standard',
  description: 'Experience the future of financial command. High-fidelity intelligence for individuals and businesses.',
};

export default function PromoPage() {
  return (
    <main className="min-h-screen bg-black">
      <PromoVideo />
    </main>
  );
}
