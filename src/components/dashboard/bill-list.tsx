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
import { formatCurrency, cn } from '@/lib/utils';
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
        <div className="space-y-6">
            {/* Mobile View */}
            <div className="space-y-4 md:hidden">
                {bills.map(bill => (
                    <Card key={bill.id} className="w-full glass-card shadow-premium border-border/40 overflow-hidden group hover:border-primary/50 transition-all duration-500">
                        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 relative z-10">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <div className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        bill.status === 'paid' ? "bg-emerald-500" : "bg-destructive animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                    )} />
                                    {bill.name}
                                </p>
                                <Badge variant={bill.status === 'paid' ? 'outline' : 'destructive'} className={cn(
                                    "mt-1 text-[9px] font-black uppercase tracking-tighter",
                                    bill.status === 'paid' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                )}>
                                    {bill.status}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <AddBillDialog currency={bill.currency} bill={bill}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                </AddBillDialog>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-4 relative z-10">
                            <div className="grid grid-cols-2 gap-4">
                                <div className='space-y-0.5'>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Maturity Date</p>
                                    <p className="text-xs font-bold text-foreground">
                                        {new Date((bill.dueDate as any).toDate ? (bill.dueDate as any).toDate() : bill.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className='space-y-0.5 text-right'>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Obligation</p>
                                    <p className="text-xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">
                                        {formatCurrency(bill.amount, bill.currency)}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-border/20">
                                <MarkAsPaidButton bill={bill} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-border/40">
                <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b border-border/40">
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Entity</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Maturity Date</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Execution</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {bills.map(bill => (
                    <TableRow key={bill.id} className="group transition-colors hover:bg-primary/5 duration-300 border-b border-border/40 last:border-0 h-16">
                        <TableCell className="font-bold text-sm tracking-tight">{bill.name}</TableCell>
                        <TableCell className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">
                            {new Date((bill.dueDate as any).toDate ? (bill.dueDate as any).toDate() : bill.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                            <Badge variant={bill.status === 'paid' ? 'outline' : 'destructive'} className={cn(
                                "text-[10px] font-black uppercase tracking-tighter",
                                bill.status === 'paid' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            )}>
                                {bill.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-lg tracking-tighter text-foreground group-hover:text-primary transition-colors">
                            {formatCurrency(bill.amount, bill.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                             <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <MarkAsPaidButton bill={bill} />
                             </div>
                            <AddBillDialog currency={bill.currency} bill={bill}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                            </AddBillDialog>
                          </div>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          No bills tracked yet. Get started by adding one!
        </div>
      )}
    </div>
  );
}
