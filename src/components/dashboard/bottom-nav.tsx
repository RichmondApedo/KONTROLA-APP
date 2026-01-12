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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/income', icon: Wallet, label: 'Income' },
  { href: '/dashboard/expenses', icon: ArrowRightLeft, label: 'Expenses' },
  { href: '/dashboard/budget', icon: Target, label: 'Budget' },
  { href: '/dashboard/reports', icon: TrendingUp, label: 'Reports' },
  { href: '/dashboard/advisor', icon: Bot, label: 'Advisor' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur-sm">
      <div className="mx-auto grid h-16 max-w-md grid-cols-6 items-center justify-items-center gap-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              href={item.href}
              key={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-md p-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive && 'text-primary'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
