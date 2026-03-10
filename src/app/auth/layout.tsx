import { Logo } from '@/components/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center bg-muted/20 p-8 text-center">
        <div className="w-full max-w-md">
            <Logo className="mx-auto text-4xl mb-6" />
            <h2 className="text-3xl font-bold font-headline text-foreground">
                Take Control of Your Finances
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
                The all-in-one platform to track, manage, and grow your money.
            </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
          {children}
      </div>
    </main>
  );
}
