'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import type { IncomeSource, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AddIncomeDialog } from '@/components/dashboard/add-income-dialog';
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
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

function DeleteIncomeButton({ incomeId }: { incomeId: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleDelete = async () => {
        if (!user || !firestore) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'You must be signed in to perform this action.',
            });
            return;
        }

        const incomeRef = doc(firestore, 'users', user.uid, 'incomeSources', incomeId);
        deleteDocumentNonBlocking(incomeRef);

        toast({
            title: 'Income Deleted',
            description: 'The income entry has been removed.',
        });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this income record from our servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function IncomeList() {
  const { user } = useUser();
  const firestore = useFirestore();

  const incomeQuery = useMemoFirebase(() => 
    user && firestore
      ? query(
          collection(firestore, 'users', user.uid, 'incomeSources'),
          orderBy('date', 'desc')
        )
      : null,
    [user, firestore]
  );
  
  const { data: incomeSources, isLoading } = useCollection<IncomeSource>(incomeQuery);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incomeSources && incomeSources.length > 0 ? (
          incomeSources.map(source => (
            <TableRow key={source.id}>
              <TableCell className="font-medium">{source.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{source.category}</Badge>
              </TableCell>
              <TableCell className="text-right font-medium text-accent-foreground">
                {formatCurrency(source.amount, source.currency)}
              </TableCell>
              <TableCell>
                {new Date((source.date as any).toDate ? (source.date as any).toDate() : source.date).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <DeleteIncomeButton incomeId={source.id} />
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="text-center">
              No income sources recorded yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export default function IncomePage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const profileDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile } = useDoc<UserProfile>(profileDocRef);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Income
          </h1>
          <p className="text-muted-foreground">
            Track and manage your income sources.
          </p>
        </div>
        <AddIncomeDialog currency={profile?.preferredCurrency || 'usd'} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income History</CardTitle>
          <CardDescription>A list of all your recorded income.</CardDescription>
        </CardHeader>
        <CardContent>
          <IncomeList />
        </CardContent>
      </Card>
    </div>
  );
}
