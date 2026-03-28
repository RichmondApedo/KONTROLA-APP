'use client';

import {
  Card,
  CardContent,
  CardHeader,
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
import { useFirestore, useUser } from '@/firebase';
import type { IncomeSource } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Archive, Trash2, ArrowUpCircle, Wallet, Banknote, ArrowUpRight, Activity, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '@/lib/utils';

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

export function IncomeList({incomeSources, isLoading}: {incomeSources: IncomeSource[] | null, isLoading: boolean}) {

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
        <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
            <Archive className="mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">No Income Recorded</h3>
            <p>Add your first income source to see your history here.</p>
        </div>
      );
  }

  return (
    <>
        {/* Mobile View */}
    <div className="space-y-4 md:hidden">
        {incomeSources.map(source => {
            const isHighValue = source.amount > 5000;
            return (
                <Card 
                    key={source.id} 
                    className={cn(
                        "w-full glass-card shadow-soft border-border/40 overflow-hidden group hover:scale-[1.015] transition-all duration-500 relative",
                        isHighValue && "border-amber-500/20 shadow-[0_0_20px_-12px_rgba(245,158,11,0.3)] bg-gradient-to-br from-amber-500/[0.03] to-transparent"
                    )}
                >
                    {/* Background Floating Icon */}
                    <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 duration-700">
                      <ArrowUpCircle className={cn("h-24 w-24", isHighValue ? "text-amber-500" : "text-emerald-500")} />
                    </div>

                    <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 relative z-10">
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                                <div className={cn(
                                    "h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]",
                                    isHighValue ? "bg-amber-500" : "bg-emerald-500"
                                )} />
                                {source.name || 'Unnamed Income'}
                            </p>
                            {isHighValue && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                                        </TooltipTrigger>
                                        <TooltipContent className="text-[10px] font-black tracking-widest bg-amber-500 text-white border-none">
                                            Significant Revenue Asset
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <DeleteIncomeButton income={source} />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-4 relative z-10">
                        <div className={cn(
                            "text-4xl font-black tracking-tighter transition-colors duration-500",
                            isHighValue ? "text-amber-600" : "text-foreground group-hover:text-emerald-500"
                        )}>
                            {formatCurrency(source.amount, source.currency)}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/10">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="secondary" className={cn(
                                    "border text-[10px] font-black uppercase tracking-tighter",
                                    isHighValue ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                )}>
                                    {source.category}
                                </Badge>
                                {source.context && (
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground opacity-50 border-none">
                                        {source.context}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest italic flex items-center gap-1",
                                    isHighValue ? "text-amber-500/60" : "text-muted-foreground/40"
                                )}>
                                    {isHighValue ? <TrendingUp className="h-2 w-2" /> : <ShieldCheck className="h-2 w-2" />} Inflow Maturity
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground/60">
                                    {new Date((source.date as any).toDate ? (source.date as any).toDate() : source.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
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
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Description</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Category</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Context</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">Amount</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Date</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {incomeSources.map(source => (
                    <TableRow key={source.id} className="group transition-all hover:bg-emerald-500/[0.03] duration-500 border-b border-border/40 last:border-0 h-16">
                        <TableCell className="font-bold text-sm tracking-tight">
                            <div className="flex items-center gap-3">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                {source.name || 'Unnamed Income'}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-black uppercase tracking-tighter">
                                {source.category}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {source.context ? (
                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground opacity-40">
                                    {source.context}
                                </Badge>
                            ) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-black text-xl tracking-tighter transition-colors duration-500">
                            <span className={source.amount > 5000 ? "text-amber-600" : "text-foreground group-hover:text-emerald-500"}>
                                {formatCurrency(source.amount, source.currency)}
                            </span>
                        </TableCell>
                        <TableCell className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground/60">
                           <div className="flex items-center gap-2">
                                <Activity className="h-3 w-3 text-emerald-500/30" />
                                {new Date((source.date as any).toDate ? (source.date as any).toDate() : source.date).toLocaleDateString()}
                           </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <DeleteIncomeButton income={source} />
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
    </>
  );
}
