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
import { Check, Pencil, Bell, Calendar, ArrowUpRight, Activity } from 'lucide-react';
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
                    <Card key={bill.id} className="w-full glass-card shadow-premium border-border/40 overflow-hidden group hover:border-primary/50 hover:bg-primary/[0.02] hover:scale-[1.015] transition-all duration-500 relative">
                        {/* Background Floating Icon */}
                        <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:rotate-12 duration-700">
                          <Bell className="h-24 w-24 text-primary" />
                        </div>

                        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 relative z-10">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                                    <div className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        bill.status === 'paid' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-destructive animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                    )} />
                                    {bill.name}
                                </p>
                                <Badge variant={bill.status === 'paid' ? 'outline' : 'destructive'} className={cn(
                                    "text-[9px] font-black uppercase tracking-tighter",
                                    bill.status === 'paid' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                )}>
                                    {bill.status}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <AddBillDialog currency={bill.currency} bill={bill}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                </AddBillDialog>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 space-y-4 relative z-10">
                            <div className="grid grid-cols-2 gap-4">
                                <div className='space-y-1'>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Maturity Date</p>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                        <Calendar className="h-3 w-3 text-muted-foreground/40" />
                                        {new Date((bill.dueDate as any).toDate ? (bill.dueDate as any).toDate() : bill.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                </div>
                                <div className='space-y-1 text-right'>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Obligation</p>
                                    <p className="text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors duration-500">
                                        {formatCurrency(bill.amount, bill.currency)}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-border/20 flex items-center justify-between">
                                <MarkAsPaidButton bill={bill} />
                                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 italic flex items-center gap-1">
                                    Financial Commitment <ArrowUpRight className="h-2 w-2" />
                                </div>
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
                    <TableRow key={bill.id} className={cn(
                        "group transition-all hover:bg-primary/[0.03] duration-500 border-b border-border/40 last:border-0 h-16",
                        bill.status === 'unpaid' && "hover:bg-destructive/[0.02]"
                    )}>
                        <TableCell className="font-bold text-sm tracking-tight relative overflow-hidden">
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    bill.status === 'paid' ? "bg-emerald-500" : "bg-destructive animate-pulse"
                                )} />
                                {bill.name}
                            </div>
                        </TableCell>
                        <TableCell className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground/60">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-muted-foreground/30" />
                                {new Date((bill.dueDate as any).toDate ? (bill.dueDate as any).toDate() : bill.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={bill.status === 'paid' ? 'outline' : 'destructive'} className={cn(
                                "text-[10px] font-black uppercase tracking-tighter transition-all duration-300",
                                bill.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "group-hover:scale-105"
                            )}>
                                {bill.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-xl tracking-tighter text-foreground group-hover:text-primary transition-colors duration-500">
                            {formatCurrency(bill.amount, bill.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <MarkAsPaidButton bill={bill} />
                                <AddBillDialog currency={bill.currency} bill={bill}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
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
