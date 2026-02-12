'use client';

import { useMemo } from 'react';
import {
  useCollection,
  useFirestore,
  useUser,
} from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import type { Bill } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Button } from '../ui/button';
import { AddBillDialog } from './add-bill-dialog';
import { Check, Pencil } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader } from '../ui/card';

function MarkAsPaidButton({ bill }: { bill: Bill }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleMarkAsPaid = () => {
    if (!user || !firestore) return;
    const billRef = doc(firestore, 'users', user.uid, 'bills', bill.id);
    updateDocumentNonBlocking(billRef, { status: 'paid' });
    toast({ title: 'Bill Marked as Paid', description: `${bill.name} has been updated.` });
  };

  return (
    <Button variant="outline" size="sm" onClick={handleMarkAsPaid} disabled={bill.status === 'paid'}>
      <Check className="mr-2 h-4 w-4" />
      {bill.status === 'paid' ? 'Paid' : 'Mark as Paid'}
    </Button>
  );
}

export function BillList() {
  const { user } = useUser();
  const firestore = useFirestore();

  const billsQuery = useMemo(
    () =>
      user && firestore
        ? query(
            collection(firestore, 'users', user.uid, 'bills'),
            orderBy('dueDate', 'asc')
          )
        : null,
    [user, firestore]
  );

  const { data: bills, isLoading } = useCollection<Bill>(billsQuery);

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-2">
        <Skeleton className="h-32 w-full md:h-10" />
        <Skeleton className="h-32 w-full md:h-10" />
        <Skeleton className="h-32 w-full md:h-10" />
      </div>
    );
  }

  return (
    <div>
      {bills && bills.length > 0 ? (
        <>
            {/* Mobile View */}
            <div className="space-y-4 md:hidden">
                {bills.map(bill => (
                    <Card key={bill.id}>
                        <CardHeader className="flex flex-row items-center justify-between p-4">
                            <div>
                                <p className="font-semibold">{bill.name}</p>
                                <Badge variant={bill.status === 'paid' ? 'secondary' : 'destructive'}>
                                    {bill.status}
                                </Badge>
                            </div>
                            <AddBillDialog currency={bill.currency} bill={bill}>
                                <Button variant="ghost" size="icon">
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </AddBillDialog>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="flex w-full flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
                                <div className='space-y-2'>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Due Date</p>
                                        <p>{new Date((bill.dueDate as any).toDate ? (bill.dueDate as any).toDate() : bill.dueDate).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Amount</p>
                                        <p className="font-semibold">{formatCurrency(bill.amount, bill.currency)}</p>
                                    </div>
                                </div>
                                <MarkAsPaidButton bill={bill} />
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
                    <TableHead>Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {bills.map(bill => (
                    <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.name}</TableCell>
                        <TableCell>{formatCurrency(bill.amount, bill.currency)}</TableCell>
                        <TableCell>{new Date((bill.dueDate as any).toDate ? (bill.dueDate as any).toDate() : bill.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                        <Badge variant={bill.status === 'paid' ? 'secondary' : 'destructive'}>
                            {bill.status}
                        </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                        <MarkAsPaidButton bill={bill} />
                        <AddBillDialog currency={bill.currency} bill={bill}>
                            <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                            </Button>
                        </AddBillDialog>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
        </>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          No bills tracked yet. Get started by adding one!
        </div>
      )}
    </div>
  );
}
