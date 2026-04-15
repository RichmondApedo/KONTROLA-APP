'use client';

import { useMemo } from 'react';
import {
  useCollection,
  useFirestore,
  useUser,
  useUserProfile,
} from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, where } from 'firebase/firestore';
import type { Bill } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { AddBillDialog } from './add-bill-dialog';
import { processBillPayment } from '@/lib/business-logic';
import { Check, Pencil, Bell, Calendar, ArrowUpRight, Activity, Sparkles, AlertCircle, Clock, CheckCircle2, Briefcase, User as UserIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { differenceInDays, isPast, isToday } from 'date-fns';
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
  const { activeProfileId } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();

  const targetUid = activeProfileId || user?.uid;

  const handleMarkAsPaid = () => {
    if (!user || !firestore || !targetUid) return;
    processBillPayment(firestore, targetUid, bill);
    toast({ title: 'Bill Marked as Paid', description: `${bill.name} has been updated and recorded as an expense.` });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleMarkAsPaid} 
            disabled={bill.status === 'paid'}
            className={cn(
                "h-8 px-3 rounded-full text-[10px] font-black uppercase tracking-widest border-emerald-500/20 transition-all duration-300",
                bill.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border-none opacity-100" : "hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/50"
            )}
          >
            {bill.status === 'paid' ? <CheckCircle2 className="mr-1.5 h-3 w-3" /> : <Clock className="mr-1.5 h-3 w-3 opacity-60" />}
            {bill.status === 'paid' ? 'Settled' : 'Execute Payment'}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-[10px] font-black tracking-widest bg-emerald-500 text-white border-none">
          {bill.status === 'paid' ? 'Commitment Fulfilled' : 'Authorize Outflow'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function BillList({ filterContext }: { filterContext?: 'personal' | 'business' }) {
  const { user } = useUser();
  const { activeProfileId } = useUserProfile();
  const firestore = useFirestore();

  const targetUid = activeProfileId || user?.uid;

  const billsQuery = useMemo(
    () => {
      if (!targetUid || !firestore) return null;
      let baseQuery = collection(firestore, 'users', targetUid, 'bills');
      
      // Note: In production, you'd need a composite index for (userId, context, dueDate)
      // For now, if context is provided, we might filter client-side if no index exists,
      // but let's try the direct query first.
      return query(
        baseQuery,
        ...(filterContext ? [where('context', '==', filterContext)] : []),
        orderBy('dueDate', 'asc')
      );
    },
    [targetUid, firestore, filterContext]
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
                {bills.map(bill => {
                    const dueDate = new Date((bill.dueDate as any).toDate ? (bill.dueDate as any).toDate() : bill.dueDate);
                    const daysUntil = differenceInDays(dueDate, new Date());
                    const isOverdue = isPast(dueDate) && !isToday(dueDate) && bill.status !== 'paid';
                    const isDueSoon = daysUntil <= 3 && daysUntil >= 0 && bill.status !== 'paid';
                    const isHighValue = bill.amount > 5000;

                    return (
                        <Card 
                            key={bill.id} 
                            className={cn(
                                "w-full glass-card shadow-premium border-border/40 overflow-hidden group hover:scale-[1.015] transition-all duration-500 relative",
                                isHighValue && "border-amber-500/20 shadow-[0_0_20px_-12px_rgba(245,158,11,0.3)] bg-gradient-to-br from-amber-500/[0.03] to-transparent"
                            )}
                        >
                            {/* Background Floating Icon */}
                            <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:rotate-12 duration-700">
                              <Bell className={cn("h-24 w-24", isHighValue ? "text-amber-500" : "text-primary")} />
                            </div>

                            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 relative z-10">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                                            <div className={cn(
                                                "h-1.5 w-1.5 rounded-full",
                                                bill.status === 'paid' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                                                isDueSoon ? "bg-amber-500 animate-pulse" : "bg-destructive animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                            )} />
                                            {bill.name}
                                        </p>
                                        {isHighValue && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="text-[10px] font-black tracking-widest bg-amber-500 text-white border-none">
                                                        Significant Financial Obligation
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                        <Badge variant="secondary" className="bg-primary/5 text-muted-foreground/60 text-[8px] font-bold uppercase border-none ml-1">
                                            {bill.context === 'business' ? <Briefcase className="mr-1 h-2 w-2" /> : <UserIcon className="mr-1 h-2 w-2" />}
                                            {bill.context || 'personal'}
                                        </Badge>
                                    </div>
                                    <Badge 
                                        variant="outline" 
                                        className={cn(
                                            "text-[9px] font-black uppercase tracking-tighter border-none",
                                            bill.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" : 
                                            isDueSoon ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"
                                        )}
                                    >
                                        {bill.status === 'paid' ? 'Settled' : isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : 'Upcoming'}
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
                                            <Calendar className={cn("h-3 w-3", isDueSoon ? "text-amber-500" : "text-muted-foreground/40")} />
                                            {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </div>
                                    <div className='space-y-1 text-right'>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Obligation</p>
                                        <div className={cn(
                                            "text-2xl font-black tracking-tighter transition-colors duration-500",
                                            isHighValue ? "text-amber-600" : "text-foreground group-hover:text-primary"
                                        )}>
                                            {formatCurrency(bill.amount, bill.currency)}
                                        </div>
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
                    );
                })}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-border/40">
                <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b border-border/40">
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customer</TableHead>
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
                                <div className="flex flex-col">
                                    <span>{bill.name}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 flex items-center gap-1">
                                         {bill.context === 'business' ? <Briefcase className="h-2 w-2" /> : <UserIcon className="h-2 w-2" />}
                                         {bill.context || 'personal'}
                                    </span>
                                </div>
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
                        <TableCell className="text-right font-black text-xl tracking-tighter transition-colors duration-500">
                            <span className={bill.amount > 5000 ? "text-amber-600 font-black" : "text-foreground group-hover:text-primary font-bold"}>
                                {formatCurrency(bill.amount, bill.currency)}
                            </span>
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
