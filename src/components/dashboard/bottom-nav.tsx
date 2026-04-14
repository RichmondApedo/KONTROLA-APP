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
  Smartphone,
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
import { useStandalone } from '@/hooks/use-standalone';


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
  const isStandalone = useStandalone();

  const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
  const isProPlus = profile?.plan === 'pro-plus' || isAdmin;

  const { mainNavItems, moreNavItems } = useMemo(() => {
    const main = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/income', icon: Landmark, label: 'Income' },
      { href: '/dashboard/expenses', icon: ShoppingCart, label: 'Expenses' },
      { href: '/dashboard/business', icon: Briefcase, label: 'Business' },
    ];
    const more = [
      { href: '/dashboard/budget', icon: Target, label: 'Budgets' },
      { href: '/dashboard/bills', icon: Receipt, label: 'Bills' },
      { href: '/dashboard/goals', icon: Goal, label: 'Goals' },
      { href: '/dashboard/score', icon: Gauge, label: 'Score' },
      { href: '/pricing', icon: CreditCard, label: 'Pricing' },
      { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
      { href: '/dashboard/help', icon: MessageCircleQuestion, label: 'Help' },
      { href: '/dashboard/admin', icon: ShieldCheck, label: 'Admin' },
    ];

    if (isProPlus) {
      main.push({ href: '/dashboard/reports', icon: BarChartBig, label: 'Reports' });
      more.unshift({ href: '/dashboard/advisor', icon: Bot, label: 'Advisor' });
    } else {
      main.push({ href: '/dashboard/advisor', icon: Bot, label: 'Advisor' });
      more.unshift({ href: '/dashboard/reports', icon: BarChartBig, label: 'Reports' });
    }

    return { mainNavItems: main, moreNavItems: more };
  }, [isProPlus]);


  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-premium md:hidden transition-all duration-300">
      <div className="mx-auto grid h-16 max-w-md grid-cols-6 items-center justify-items-center gap-0 xs:gap-1 px-1 xs:px-2">
        {mainNavItems.map(item => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
          />
        ))}
        <Sheet open={isMoreSheetOpen} onOpenChange={setIsMoreSheetOpen}>
          <SheetTrigger asChild>
            <button
              className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 rounded-md p-1 sm:p-1.5 transition-colors group"
            >
               <div className="flex h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-card to-muted border border-border/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_3px_rgba(0,0,0,0.2)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30">
                  <MoreHorizontal className="h-4.5 w-4.5 xs:h-5 xs:w-5 sm:h-6 sm:w-6 text-muted-foreground transition-colors duration-200 group-hover:text-primary" />
               </div>
              <span className="text-[10px] sm:text-[11px] font-bold truncate max-w-full tracking-tight text-muted-foreground transition-colors group-hover:text-primary">
                More
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-3xl border-t-2 border-primary/20 glass-card pb-10">
            <SheetHeader className="mb-8 pt-2">
              <div className="mx-auto w-12 h-1.5 rounded-full bg-muted/40 mb-4" />
              <SheetTitle className="text-sm font-black uppercase tracking-[0.2em] text-center text-primary/80">More Features</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-4 gap-y-8 gap-x-2 px-2">
              {moreNavItems.map(item => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    href={item.href}
                    key={item.href}
                    onClick={() => setIsMoreSheetOpen(false)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 text-center group",
                      isActive && "text-primary"
                    )}
                  >
                    <div className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/30 text-muted-foreground border border-border/40 shadow-premium transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30",
                      isActive && "bg-primary/80 text-primary-foreground border-primary/50 shadow-primary/40 shadow-lg scale-110"
                    )}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tight opacity-70 group-hover:opacity-100 transition-opacity">{item.label}</span>
                  </Link>
                );
              })}

              {/* Manual PWA Download Trigger */}
              {!isStandalone && (
                <button
                  onClick={() => {
                    import('@/components/dashboard/pwa-install-prompt').then(mod => mod.triggerPWAInstall());
                    setIsMoreSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center gap-2 text-center group col-span-1"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 text-primary border border-primary/20 shadow-premium transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20 group-hover:border-primary/40">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tight opacity-70 group-hover:opacity-100 transition-opacity">Get App</span>
                </button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
});
