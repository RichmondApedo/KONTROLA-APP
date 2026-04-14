'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreditCard, LogOut, Settings, User as UserIcon, Smartphone } from 'lucide-react';
import { useUser, useUserProfile, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

export function UserNav() {
  const { user } = useUser();
  const auth = useAuth();
  const { profile } = useUserProfile();

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  };

  const getPlanIndicator = (plan?: 'free' | 'premium' | 'pro-plus') => {
    if (!plan) return null;

    if (plan === 'premium') {
      return <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400"><span className="h-2 w-2 rounded-full bg-green-500"></span>Premium</span>;
    }
    if (plan === 'pro-plus') {
      return <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400"><span className="h-2 w-2 rounded-full bg-blue-500"></span>Pro Plus</span>;
    }
    return <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><span className="h-2 w-2 rounded-full bg-muted-foreground/50"></span>Free</span>;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={user?.photoURL || ''}
              alt={user?.displayName || 'User'}
            />
            <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.displayName || 'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || user?.phoneNumber || ''}
            </p>
            <div className="pt-2">
                {getPlanIndicator(profile?.plan)}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/dashboard/settings">
            <DropdownMenuItem>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
          </Link>
          <Link href="/pricing">
            <DropdownMenuItem>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Billing</span>
            </DropdownMenuItem>
          </Link>
          <Link href="/dashboard/settings">
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem onClick={() => {
            import('@/components/dashboard/pwa-install-prompt').then(mod => mod.triggerPWAInstall());
          }}>
            <Smartphone className="mr-2 h-4 w-4" />
            <span>Install App</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
