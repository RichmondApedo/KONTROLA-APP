'use client';

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
  MoreHorizontal,
  CreditCard,
  Receipt,
  Goal,
  Shield,
  Briefcase,
  Gauge,
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
import { useMemo, useState } from 'react';
import { ClientOnly } from '../client-only';
import { useDoc, useFirestore, useUser } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';


function NavLink({
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
        'flex flex-col items-center justify-center gap-1 rounded-md p-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
        isActive && 'text-primary'
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile } = useDoc<UserProfile>(profileDocRef);
  const isProPlus = profile?.plan === 'pro-plus';

  const { mainNavItems, moreNavItems } = useMemo(() => {
    const main = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/income', icon: Wallet, label: 'Income' },
      { href: '/dashboard/expenses', icon: ArrowRightLeft, label: 'Expenses' },
    ];
    const more = [
      { href: '/dashboard/budget', icon: Target, label: 'Budgets' },
      { href: '/dashboard/bills', icon: Receipt, label: 'Bills' },
      { href: '/dashboard/goals', icon: Goal, label: 'Goals' },
      { href: '/dashboard/score', icon: Gauge, label: 'Score' },
      { href: '/pricing', icon: CreditCard, label: 'Pricing' },
      { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
      { href: '/dashboard/help', icon: LifeBuoy, label: 'Help' },
      { href: '/dashboard/admin', icon: Shield, label: 'Admin' },
    ];

    if (isProPlus) {
      main.push({ href: '/dashboard/business', icon: Briefcase, label: 'Business' });
      main.push({ href: '/dashboard/reports', icon: TrendingUp, label: 'Reports' });
      more.unshift({ href: '/dashboard/advisor', icon: Bot, label: 'Advisor' });
    } else {
      main.push({ href: '/dashboard/reports', icon: TrendingUp, label: 'Reports' });
      main.push({ href: '/dashboard/advisor', icon: Bot, label: 'Advisor' });
    }

    return { mainNavItems: main, moreNavItems: more };
  }, [isProPlus]);


  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="mx-auto grid h-16 max-w-md grid-cols-6 items-center justify-items-center gap-1 px-2">
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
            <SheetContent side="bottom" className="h-auto">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-center">More Options</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-4">
                {moreNavItems.map(item => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      href={item.href}
                      key={item.href}
                      onClick={() => setIsMoreSheetOpen(false)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 rounded-lg p-4 transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      )}
                    >
                      <item.icon className="h-6 w-6" />
                      <span className="text-sm font-medium">{item.label}</span>
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
}
