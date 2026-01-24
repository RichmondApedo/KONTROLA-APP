'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { LinkedAccount } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { Trash2, RefreshCw } from 'lucide-react';
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
import { formatCurrency } from '@/lib/utils';
import { syncAccountTransactions } from '@/ai/flows/sync-transactions-flow';

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
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
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
        <div className="space-y-4">
            {accounts.map(account => (
                <div key={account.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold">
                            {account.institutionName.charAt(0)}
                        </div>
                        <div>
                            <p className="font-semibold">{account.institutionName}</p>
                            <p className="text-sm text-muted-foreground">{account.accountName} - {account.accountNumber}</p>
                        </div>
                    </div>
                    <div className="flex items-center">
                         <div className="mr-2 text-right">
                             <p className="font-semibold">{formatCurrency(account.balance / 100, account.currency)}</p>
                             <p className="text-xs text-muted-foreground">Current Balance</p>
                         </div>
                         <SyncAccountButton accountId={account.id} />
                         <UnlinkAccountButton accountId={account.id} />
                    </div>
                </div>
            ))}
        </div>
    );
}
