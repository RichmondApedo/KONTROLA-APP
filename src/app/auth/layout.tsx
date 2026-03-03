import { Logo } from '@/components/logo';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center bg-muted p-8 text-center relative">
        <Image
          src="https://picsum.photos/seed/finance/1200/1800"
          alt="Abstract financial background"
          fill
          className="object-cover opacity-20"
          data-ai-hint="finance abstract"
        />
        <div className="relative z-10 w-full max-w-md">
            <Logo className="mx-auto text-4xl mb-6" />
            <h2 className="text-3xl font-bold font-headline text-foreground">
                Master Your Money, Simply.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
                From daily spending to long-term goals, see your complete financial picture in one place.
            </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
          {children}
      </div>
    </main>
  );
}
