'use client';

import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { BottomNav } from '@/components/dashboard/bottom-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarItem,
  SidebarLabel,
  SidebarProvider,
  SidebarSection,
  SidebarSectionHeader,
  SidebarTrigger,
} from '@/components/ui/sidebar-v2';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Gauge,
  CreditCard,
  Landmark,
  ShoppingCart,
  Target,
  Receipt,
  Goal,
  BarChartBig,
  Bot,
  Settings,
  MessageCircleQuestion,
  ShieldCheck,
} from 'lucide-react';
import { useUser, useUserProfile } from '@/firebase';
const dashboardItem = { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' };
const businessItem = { href: '/dashboard/business', icon: Briefcase, label: 'Business' };

const mainNavItems = [
  { href: '/dashboard/income', icon: Landmark, label: 'Income' },
  { href: '/dashboard/expenses', icon: ShoppingCart, label: 'Expenses' },
  { href: '/dashboard/business', icon: Briefcase, label: 'Business' },
  { href: '/dashboard/budget', icon: Target, label: 'Budgets' },
  { href: '/dashboard/bills', icon: Receipt, label: 'Bills' },
  { href: '/dashboard/goals', icon: Goal, label: 'Goals' },
  { href: '/dashboard/reports', icon: BarChartBig, label: 'Reports' },
  { href: '/dashboard/score', icon: Gauge, label: 'Kontrola Score' },
  { href: '/dashboard/advisor', icon: Bot, label: 'Advisor' },
];

const bottomNavItems = [
  { href: '/pricing', icon: CreditCard, label: 'Pricing' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  { href: '/dashboard/help', icon: MessageCircleQuestion, label: 'Help' },
  { href: '/dashboard/admin', icon: ShieldCheck, label: 'Admin' },
]

import React, { useEffect, memo } from 'react';
import { ClientOnly } from '@/components/client-only';
import { AskChatbot } from '@/components/dashboard/ask-chatbot';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';
import { PWAInstallPrompt } from '@/components/dashboard/pwa-install-prompt';
import { MilestoneCelebration } from '@/components/dashboard/milestone-celebration';

const NavItem = memo(function NavItem({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <SidebarItem isActive={isActive} asChild>
      <Link href={href} className="group">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-card to-muted border border-border/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_3px_rgba(0,0,0,0.2)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30",
          isActive && "bg-primary/80 border-primary/70 shadow-[0_0_15px] shadow-primary/50 scale-110"
        )}>
          <Icon className={cn(
            "h-6 w-6 text-muted-foreground transition-colors duration-200 group-hover:text-primary",
            isActive && "text-primary-foreground"
          )} />
        </div>
        <SidebarLabel className="font-bold text-[13px]">{label}</SidebarLabel>
      </Link>
    </SidebarItem>
  );
});

const MainSidebarContent = memo(function MainSidebarContent() {
    return (
        <>
            <SidebarSection>
              <SidebarSectionHeader>
                <Logo />
              </SidebarSectionHeader>
              <SidebarGroup>
                <NavItem key={dashboardItem.href} {...dashboardItem} />
                
                {mainNavItems.map(item => (
                  <NavItem key={item.href} {...item} />
                ))}
              </SidebarGroup>
            </SidebarSection>
            <SidebarSection isCollapsible={false} className="mt-auto">
              <SidebarGroup>
                {bottomNavItems.map(item => (
                  <NavItem key={item.href} {...item} />
                ))}
              </SidebarGroup>
            </SidebarSection>
        </>
    )
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If the user check is done and there is no user, redirect to login.
    if (!isUserLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isUserLoading, router]);

  const showLoader = isUserLoading || !user;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col bg-muted/40 md:flex-row">
        <Sidebar>
          <SidebarContent>
            <MainSidebarContent />
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-1 flex-col min-h-screen max-w-full overflow-x-hidden group-data-[collapsed=true]/sidebar-wrapper:md:pl-[68px] group-data-[collapsed=false]/sidebar-wrapper:md:pl-72 transition-all duration-500 ease-in-out bg-background">
          <header className="sticky top-0 z-30 flex h-auto min-h-[64px] items-center justify-between border-b bg-background/80 backdrop-blur-xl px-4 sm:px-6 shadow-soft transition-all duration-300 pt-[calc(env(safe-area-inset-top,0px)+8px)]">
            <div className="flex items-center gap-4 w-full justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
              </div>

              {/* Mobile Centered Logo */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden">
                <Logo className="font-headline text-primary font-extrabold text-2xl sm:text-3xl" />
              </div>

              {/* Desktop Spacer / Breadcrumbs placeholder */}
              <div className="hidden flex-1 md:flex items-center gap-4 mx-8">
                <div className="h-4 w-[1px] bg-border/40" />
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="uppercase tracking-[0.3em] text-[10px] font-black text-muted-foreground/50 italic">Strategic Intelligence Terminal</span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <ClientOnly>
                  <ThemeToggle />
                </ClientOnly>
                <ClientOnly>
                  <UserNav />
                </ClientOnly>
              </div>
            </div>
          </header>
          <main className="flex-1 p-5 pb-48 sm:p-6 sm:pb-24 w-full max-w-[100vw]">
            {showLoader ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                <div className="flex w-full max-w-xs flex-col items-center gap-6 text-center">
                    <Logo />
                    <div className="w-full">
                        <p className="animate-pulse mb-2 text-muted-foreground">Loading your dashboard...</p>
                        <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div className="absolute h-full animate-loading-bar bg-primary"></div>
                        </div>
                    </div>
                </div>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
      <ClientOnly>
        <BottomNav />
      </ClientOnly>
      <ClientOnly>
        <AskChatbot />
      </ClientOnly>
      <ClientOnly>
        <PWAInstallPrompt />
      </ClientOnly>
      <ClientOnly>
        <MilestoneCelebration />
      </ClientOnly>
    </SidebarProvider>
  );
}
