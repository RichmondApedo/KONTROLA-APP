'use client';

import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { BottomNav } from '@/components/dashboard/bottom-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-card/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
        <Logo />
        <div className="flex-1">
          {/* Can add breadcrumbs or page title here */}
        </div>
        <ThemeToggle />
        <UserNav />
      </header>
      <main className="flex-1 p-4 pb-20 sm:p-6">{children}</main>
      <BottomNav />
    </div>
  );
}
