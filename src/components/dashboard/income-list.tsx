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
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
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
import { Trash2, DollarSign, Wallet, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { AnimatedNumber } from '@/components/dashboard/animated-number';
import { IncomeChart } from '@/components/dashboard/income-chart';


function DeleteIncomeButton({ income }: { income: IncomeSource }) {
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

        const incomeRef = doc(firestore, 'users', user.uid, 'incomeSources', income.id);
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

function IncomeList({incomeSources, isLoading}: {incomeSources: IncomeSource[] | null, isLoading: boolean}) {

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!incomeSources || incomeSources.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
            No income sources recorded yet.
        </div>
      );
  }

  return (
    <>
        {/* Mobile View */}
        <div className="space-y-4 md:hidden">
            {incomeSources.map(source => (
                <Card key={source.id} className="w-full">
                    <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
                        <p className="font-medium">{source.name}</p>
                        <DeleteIncomeButton income={source} />
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                        <p className="text-xl sm:text-2xl font-bold text-accent-foreground">
                            {formatCurrency(source.amount, source.currency)}
                        </p>
                        <div className="flex items-center justify-between text-muted-foreground text-sm">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary">{source.category}</Badge>
                                {source.context && <Badge variant="outline" className="capitalize">{source.context}</Badge>}
                            </div>
                            <span>
                                {new Date((source.date as any).toDate ? (source.date as any).toDate() : source.date).toLocaleDateString()}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Context</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {incomeSources.map(source => (
                    <TableRow key={source.id}>
                    <TableCell className="font-medium">{source.name}</TableCell>
                    <TableCell>
                        <Badge variant="secondary">{source.category}</Badge>
                    </TableCell>
                    <TableCell>
                        {source.context ? <Badge variant="outline" className="capitalize">{source.context}</Badge> : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-accent-foreground">
                        {formatCurrency(source.amount, source.currency)}
                    </TableCell>
                    <TableCell>
                        {new Date((source.date as any).toDate ? (source.date as any).toDate() : source.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                        <DeleteIncomeButton income={source} />
                    </TableCell>
                    </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
    </>
  );
}
