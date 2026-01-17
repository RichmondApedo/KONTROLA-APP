

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
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { useDoc, useFirestore, useUser } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { useMemo } from 'react';
import { doc } from 'firebase/firestore';

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
    const { data: profile } = useDoc<UserProfile>(profileDocRef);
    const isProPlus = profile?.plan === 'pro-plus';

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
                {isProPlus && proNavItems.map(item => (
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
            <ThemeToggle />
            <UserNav />
          </header>
          <main className="flex-1 p-4 pb-20 sm:p-6">{children}</main>
        </div>
      </div>
      <BottomNav />
    </SidebarProvider>
  );
}
