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
  Users,
  FileText,
} from 'lucide-react';
import { useDoc, useFirestore, useUser } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { useMemo, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { ClientOnly } from '@/components/client-only';
import { Skeleton } from '@/components/ui/skeleton';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/income', icon: Wallet, label: 'Income' },
  { href: '/dashboard/expenses', icon: ArrowRightLeft, label: 'Expenses' },
  { href: '/dashboard/budget', icon: Target, label: 'Budgets' },
  { href: '/dashboard/bills', icon: Receipt, label: 'Bills' },
  { href: '/dashboard/goals', icon: Goal, label: 'Goals' },
  { href: '/dashboard/reports', icon: TrendingUp, label: 'Reports' },
  { href: '/dashboard/advisor', icon: Bot, label: 'AI Advisor' },
];

const proNavItems = [
    { href: '/dashboard/business', icon: Briefcase, label: 'Business' },
    { href: '/dashboard/customers', icon: Users, label: 'Customers' },
    { href: '/dashboard/invoices', icon: FileText, label: 'Invoices' },
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
    const { user } = useUser();
    const firestore = useFirestore();

    const profileDocRef = useMemo(
        () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
        [user, firestore]
    );
    const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);
    const isProPlus = profile?.plan === 'pro-plus' || user?.email === 'richmondapedo549@gmail.com';

    return (
        <>
            <SidebarSection>
              <SidebarSectionHeader>
                <Logo />
              </SidebarSectionHeader>
              <SidebarGroup>
                {navItems.map(item => (
                  <NavItem key={item.href} {...item} />
                ))}
                {isProfileLoading ? (
                  <div className="px-3 py-2 group-data-[collapsed=true]:px-2">
                    <Skeleton className="h-8 w-full rounded-md group-data-[collapsed=true]:h-8 group-data-[collapsed=true]:w-8" />
                  </div>
                ) : isProPlus ? (
                  proNavItems.map(item => <NavItem key={item.href} {...item} />)
                ) : null}
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
  const router = useRouter();

  useEffect(() => {
    // If the user check is done and there is no user, redirect to login.
    if (!isUserLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isUserLoading, router]);

  // While the user state is loading, or if there's no user yet (before redirect),
  // show a full-screen loading indicator. This prevents a flash of the dashboard.
  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4">
        <Logo />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Authenticating...</span>
        </div>
      </div>
    );
  }
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
        <Sidebar>
          <SidebarContent>
            <MainSidebarContent />
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-card/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
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
          <main className="flex-1 p-4 pb-20 sm:p-6 relative isolate overflow-hidden">
             <div className="absolute inset-0 -z-10">
              <div className="absolute top-0 -left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
              <div className="absolute top-0 -right-1/4 w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob" style={{animationDelay: '2s'}}></div>
              <div className="absolute -bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob" style={{animationDelay: '4s'}}></div>
            </div>
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
    </SidebarProvider>
  );
}

    