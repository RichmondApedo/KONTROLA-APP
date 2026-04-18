'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, doc, updateDoc } from 'firebase/firestore';
import type { LinkedAccount } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { Trash2, RefreshCw, Briefcase, User, Layers } from 'lucide-react';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import { syncAccountTransactions } from '@/ai/flows/sync-transactions-flow';

type AccountPurpose = 'personal' | 'business' | 'both';

const purposeConfig: Record<AccountPurpose, { label: string; icon: React.ElementType; className: string }> = {
  personal: {
    label: 'Personal',
    icon: User,
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  business: {
    label: 'Business',
    icon: Briefcase,
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  both: {
    label: 'Mixed',
    icon: Layers,
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
};

function AccountPurposeBadge({ purpose }: { purpose: AccountPurpose }) {
  const config = purposeConfig[purpose];
  const Icon = config.icon;
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] font-black uppercase tracking-widest flex items-center gap-1 px-2 py-0.5', config.className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function ChangePurposeDropdown({ accountId, currentPurpose }: { accountId: string; currentPurpose: AccountPurpose }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChangePurpose = async (purpose: AccountPurpose) => {
    if (!user || !firestore || purpose === currentPurpose) return;
    setIsUpdating(true);
    try {
      const accountRef = doc(firestore, 'users', user.uid, 'linkedAccounts', accountId);
      await updateDoc(accountRef, { accountPurpose: purpose });
      toast({
        title: 'Account Purpose Updated',
        description: `This account will now sync transactions as ${purpose === 'both' ? 'Mixed (Personal & Business)' : purpose}.`,
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update account purpose.' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isUpdating}
          className="h-7 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {isUpdating ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Change'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-card shadow-premium border-border/40 w-52">
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Used for...
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.entries(purposeConfig) as [AccountPurpose, typeof purposeConfig[AccountPurpose]][]).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => handleChangePurpose(key)}
              disabled={key === currentPurpose}
              className="flex items-center gap-2 font-bold text-xs"
            >
              <Icon className="h-4 w-4" />
              <div>
                <p>{config.label}</p>
                <p className="text-[10px] text-muted-foreground font-normal">
                  {key === 'personal' && 'All transactions go to Personal'}
                  {key === 'business' && 'All transactions go to Business'}
                  {key === 'both' && 'Auto-classify using your Customer list'}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SyncAccountButton({ accountId }: { accountId: string }) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const result = await syncAccountTransactions({ accountId, userId: user.uid });
      toast({
        title: 'Sync Complete',
        description: result.message,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleSync} disabled={isSyncing}>
      {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      <span className="sr-only">Sync Account</span>
    </Button>
  );
}

function UnlinkAccountButton({ accountId }: { accountId: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleUnlink = () => {
    if (!user || !firestore) return;
    const accountRef = doc(firestore, 'users', user.uid, 'linkedAccounts', accountId);
    deleteDocumentNonBlocking(accountRef);
    toast({
      title: 'Account Unlinked',
      description: 'The account has been successfully unlinked.',
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Trash2 className="h-4 w-4 text-destructive" />
          <span className="sr-only">Unlink Account</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will unlink the account from KONTROLA. You can always link it again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleUnlink} className="bg-destructive hover:bg-destructive/90">
            Unlink
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function LinkedAccountList() {
  const { user } = useUser();
  const firestore = useFirestore();

  const linkedAccountsQuery = useMemo(
    () => user && firestore ? query(collection(firestore, 'users', user.uid, 'linkedAccounts')) : null,
    [user, firestore]
  );

  const { data: accounts, isLoading } = useCollection<LinkedAccount>(linkedAccountsQuery);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full sm:h-16" />
        <Skeleton className="h-24 w-full sm:h-16" />
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No accounts linked yet. Connect an account to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {accounts.map(account => {
        const purpose: AccountPurpose = (account.accountPurpose as AccountPurpose) || 'personal';
        return (
          <div
            key={account.id}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-border/40 p-4 gap-4 glass-card"
          >
            <div className="flex w-full items-center gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-secondary font-bold text-sm">
                {account.institutionName.charAt(0)}
              </div>
              <div className="flex-grow overflow-hidden space-y-1">
                <p className="font-bold text-sm truncate">{account.institutionName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{account.accountName} — {account.accountNumber}</p>
                <div className="flex items-center gap-2 pt-0.5">
                  <AccountPurposeBadge purpose={purpose} />
                  <ChangePurposeDropdown accountId={account.id} currentPurpose={purpose} />
                </div>
              </div>
            </div>
            <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end">
              <div className="text-left sm:mr-2 sm:text-right">
                <p className="font-bold">{formatCurrency(account.balance / 100, account.currency)}</p>
                <p className="text-xs text-muted-foreground">Current Balance</p>
              </div>
              <div className="flex items-center">
                <SyncAccountButton accountId={account.id} />
                <UnlinkAccountButton accountId={account.id} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
