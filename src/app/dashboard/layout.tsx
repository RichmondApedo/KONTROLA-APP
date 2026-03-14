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
  TrendingUp,
  Wallet,
  ArrowRightLeft,
  Bot,
  Target,
  Settings,
  LifeBuoy,
  CreditCard,
  Receipt,
  Goal,
  Shield,
  Briefcase,
  Loader2,
  Gauge,
} from 'lucide-react';
import { useUser, useUserProfile } from '@/firebase';
import { useEffect } from 'react';
import { ClientOnly } from '@/components/client-only';
import { Skeleton } from '@/components/ui/skeleton';
import { AskChatbot } from '@/components/dashboard/ask-chatbot';

const dashboardItem = { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' };
const businessItem = { href: '/dashboard/business', icon: Briefcase, label: 'Business' };

const mainNavItems = [
  { href: '/dashboard/income', icon: Wallet, label: 'Income' },
  { href: '/dashboard/expenses', icon: ArrowRightLeft, label: 'Expenses' },
  { href: '/dashboard/budget', icon: Target, label: 'Budgets' },
  { href: '/dashboard/bills', icon: Receipt, label: 'Bills' },
  { href: '/dashboard/goals', icon: Goal, label: 'Goals' },
  { href: '/dashboard/reports', icon: TrendingUp, label: 'Reports' },
  { href: '/dashboard/score', icon: Gauge, label: 'Kontrola Score' },
  { href: '/dashboard/advisor', icon: Bot, label: 'AI Advisor' },
];

const bottomNavItems = [
  { href: '/pricing', icon: CreditCard, label: 'Pricing' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  { href: '/dashboard/help', icon: LifeBuoy, label: 'Help' },
  { href: '/dashboard/admin', icon: Shield, label: 'Admin' },
]

function NavItem({
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
      <Link href={href}>
        <Icon />
        <SidebarLabel>{label}</SidebarLabel>
      </Link>
    </SidebarItem>
  );
}

function MainSidebarContent() {
    const { profile, isProfileLoading } = useUserProfile();
    
    const isAdmin = profile?.role === 'admin';
    const isProPlus = profile?.plan === 'pro-plus' || isAdmin;

    return (
        <>
            <SidebarSection>
              <SidebarSectionHeader>
                <Logo />
              </SidebarSectionHeader>
              <SidebarGroup>
                <NavItem key={dashboardItem.href} {...dashboardItem} />
                
                {mainNavItems.slice(0, 2).map(item => (
                  <NavItem key={item.href} {...item} />
                ))}

                {isProfileLoading ? (
                  <div className="px-3 py-2 group-data-[collapsed=true]:px-2">
                    <Skeleton className="h-8 w-full rounded-md group-data-[collapsed=true]:h-8 group-data-[collapsed=true]:w-8" />
                  </div>
                ) : isProPlus ? (
                  <NavItem key={businessItem.href} {...businessItem} />
                ) : null}

                {mainNavItems.slice(2).map(item => (
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
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const { isProfileLoading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    // If the user check is done and there is no user, redirect to login.
    if (!isUserLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isUserLoading, router]);

  // While the user state or profile is loading, or if there's no user yet (before redirect),
  // show the main layout with a loading indicator in the content area.
  // This improves perceived performance by showing the app shell immediately.
  if (isUserLoading || isProfileLoading || !user) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full flex-col bg-muted/40 md:flex-row">
          <Sidebar>
            <SidebarContent>
              <MainSidebarContent />
            </SidebarContent>
          </Sidebar>

          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-16 sm:px-6">
              <SidebarTrigger />
              <div className="flex-1 md:hidden">
                <Logo className="font-headline text-primary font-extrabold text-3xl" />
              </div>
              <div className="hidden flex-1 md:block">{/* Page Title or Breadcrumbs */}</div>
              <ClientOnly>
                <ThemeToggle />
              </ClientOnly>
              <ClientOnly>
                <UserNav />
              </ClientOnly>
            </header>
            <main className="flex-1 p-4 pb-20 sm:p-6">
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading your dashboard...</span>
                </div>
              </div>
            </main>
          </div>
        </div>
        <ClientOnly>
          <BottomNav />
        </ClientOnly>
        <ClientOnly>
          <AskChatbot />
        </ClientOnly>
      </SidebarProvider>
    );
  }
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col bg-muted/40 md:flex-row">
        <Sidebar>
          <SidebarContent>
            <MainSidebarContent />
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-16 sm:px-6">
            <SidebarTrigger />
            <div className="flex-1 md:hidden">
              <Logo className="font-headline text-primary font-extrabold text-3xl" />
            </div>
            <div className="hidden flex-1 md:block">{/* Page Title or Breadcrumbs */}</div>
            <ClientOnly>
              <ThemeToggle />
            </ClientOnly>
            <ClientOnly>
              <UserNav />
            </ClientOnly>
          </header>
          <main className="flex-1 p-4 pb-20 sm:p-6">
            {children}
          </main>
        </div>
      </div>
      <ClientOnly>
        <BottomNav />
      </ClientOnly>
      <ClientOnly>
        <AskChatbot />
      </ClientOnly>
    </SidebarProvider>
  );
}
