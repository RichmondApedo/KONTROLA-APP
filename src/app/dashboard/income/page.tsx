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
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { IncomeSource } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AddIncomeDialog } from '@/components/dashboard/add-income-dialog';

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
                {new Date(source.date).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={4} className="text-center">
              No income sources recorded yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export default function IncomePage() {
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
        <AddIncomeDialog />
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
