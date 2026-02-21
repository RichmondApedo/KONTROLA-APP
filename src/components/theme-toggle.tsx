'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useDoc, useFirestore, useUser } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const unlockedThemes = [
  { id: 'theme_ocean', name: 'Ocean' },
  { id: 'theme_sunset', name: 'Sunset' },
];

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const { user } = useUser();
  const firestore = useFirestore();

  const profileDocRef = React.useMemo(
    () => (user ? doc(firestore, `users/${user.uid}/profile/${user.uid}`) : null),
    [user, firestore]
  );
  const { data: profile } = useDoc<UserProfile>(profileDocRef);

  const availableThemes = React.useMemo(() => {
    if (!profile?.unlockedRewardIds) return [];
    return unlockedThemes.filter(theme => profile.unlockedRewardIds?.includes(theme.id));
  }, [profile]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
        {availableThemes.length > 0 && <DropdownMenuSeparator />}
        {availableThemes.map(theme => (
          <DropdownMenuItem key={theme.id} onClick={() => setTheme(theme.name.toLowerCase())}>
            {theme.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
