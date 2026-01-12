'use client';

import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { BottomNav } from '@/components/dashboard/bottom-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from '@/components/ui/sidebar';
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
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/income', icon: Wallet, label: 'Income' },
  { href: '/dashboard/expenses', icon: ArrowRightLeft, label: 'Expenses' },
  { href: '/dashboard/budget', icon: Target, label: 'Budget' },
  { href: '/dashboard/reports', icon: TrendingUp, label: 'Reports' },
  { href: '/dashboard/advisor', icon: Bot, label: 'Advisor' },
];

const secondaryNavItems = [
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  { href: '/dashboard/help', icon: LifeBuoy, label: 'Help' },
]

function DesktopSidebar() {
  const pathname = usePathname();
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="hidden md:flex">
        <SidebarContent>
          <SidebarGroup>
            {/* This space is intentionally left empty */}
          </SidebarGroup>
        </SidebarContent>

        <SidebarContent className="!flex-none">
           <SidebarGroup>
            <SidebarMenu>
              {navItems.map(item => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
              {secondaryNavItems.map(item => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  return (
    <div className="flex min-h-screen">
      <DesktopSidebar />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-card/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Logo />
          </div>
          <div className="hidden md:block">
            <Logo />
          </div>
          <div className="flex-1">
            {/* Can add breadcrumbs or page title here */}
          </div>
          <ThemeToggle />
          <UserNav />
        </header>
        <main className="flex-1 p-4 pb-20 sm:p-6">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
