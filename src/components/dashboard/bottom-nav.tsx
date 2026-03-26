'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Gauge,
  CreditCard,
  MoreHorizontal,
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
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import React, { useMemo, useState, memo } from 'react';
import { ClientOnly } from '../client-only';
import { useUser, useUserProfile } from '@/firebase';


const NavLink = memo(function NavLink({
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
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 sm:gap-1 rounded-md p-1 sm:p-1.5 transition-colors group',
        isActive ? 'text-primary' : 'hover:text-foreground'
      )}
    >
      <div className={cn(
          "flex h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-card to-muted border border-border/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_3px_rgba(0,0,0,0.2)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30",
          isActive && "bg-primary/80 border-primary/70 shadow-[0_0_15px] shadow-primary/50 scale-110"
        )}>
          <Icon className={cn(
            "h-4.5 w-4.5 xs:h-5 xs:w-5 sm:h-6 sm:w-6 text-muted-foreground transition-colors duration-200 group-hover:text-primary",
            isActive && "text-primary-foreground"
          )} />
      </div>
      <span className={cn(
        "text-[10px] sm:text-[11px] font-bold truncate max-w-full tracking-tight transition-colors",
        isActive ? "text-primary" : "text-muted-foreground"
      )}>
        {label === 'Dashboard' ? 'Home' : label}
      </span>
    </Link>
  );
});

export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const { user } = useUser();
  const { profile } = useUserProfile();

  const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
  const isProPlus = profile?.plan === 'pro-plus' || isAdmin;

  const { mainNavItems, moreNavItems } = useMemo(() => {
    const main = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/income', icon: Landmark, label: 'Income' },
      { href: '/dashboard/expenses', icon: ShoppingCart, label: 'Expenses' },
    ];
    const more = [
      { href: '/dashboard/budget', icon: Target, label: 'Budgets' },
      { href: '/dashboard/bills', icon: Receipt, label: 'Bills' },
      { href: '/dashboard/goals', icon: Goal, label: 'Goals' },
      { href: '/dashboard/score', icon: Gauge, label: 'Score' },
      { href: '/pricing', icon: CreditCard, label: 'Pricing' },
      { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
      { href: '/dashboard/ask', icon: Bot, label: 'Ask AI' },
      { href: '/dashboard/help', icon: MessageCircleQuestion, label: 'Help' },
      { href: '/dashboard/admin', icon: ShieldCheck, label: 'Admin' },
    ];

    if (isProPlus) {
      main.push({ href: '/dashboard/business', icon: Briefcase, label: 'Business' });
      main.push({ href: '/dashboard/reports', icon: BarChartBig, label: 'Reports' });
      more.unshift({ href: '/dashboard/advisor', icon: Bot, label: 'Advisor' });
    } else {
      main.push({ href: '/dashboard/reports', icon: BarChartBig, label: 'Reports' });
      main.push({ href: '/dashboard/advisor', icon: Bot, label: 'Advisor' });
    }

    return { mainNavItems: main, moreNavItems: more };
  }, [isProPlus]);


  return (
    <nav className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg rounded-2xl border bg-background/60 backdrop-blur-xl shadow-premium md:hidden transition-all duration-300">
      <div className="mx-auto grid h-16 max-w-md grid-cols-6 items-center justify-items-center gap-0 xs:gap-1 px-1 xs:px-2">
        {mainNavItems.map(item => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
          />
        ))}
        <ClientOnly>
          <Sheet open={isMoreSheetOpen} onOpenChange={setIsMoreSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="flex h-auto flex-col items-center justify-center gap-1 rounded-md p-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <MoreHorizontal className="h-5 w-5" />
                <span>More</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto rounded-t-2xl">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-center">More Options</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                {moreNavItems.map(item => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      href={item.href}
                      key={item.href}
                      onClick={() => setIsMoreSheetOpen(false)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 text-center group",
                        isActive && "text-primary"
                      )}
                    >
                      <div className={cn(
                        "flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:bg-accent group-hover:text-accent-foreground group-hover:shadow-md",
                        isActive && "bg-primary text-primary-foreground shadow-primary/30 shadow-lg"
                      )}>
                        <item.icon className="h-8 w-8" />
                      </div>
                      <span className="text-[11px] font-bold">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </ClientOnly>
      </div>
    </nav>
  );
});
