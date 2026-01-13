'use client';

import { useMemo } from 'react';
import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirestore,
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

  const billsQuery = useMemoFirestore(
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
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div>
      {bills && bills.length > 0 ? (
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
      ) : (
        <div className="text-center text-muted-foreground py-8">
          No bills tracked yet. Get started by adding one!
        </div>
      )}
    </div>
  );
}
