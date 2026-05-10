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
import { useFirestore, useUser, useUserProfile } from '@/firebase';
import type { Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

function DeleteExpenseButton({ expense }: { expense: Expense }) {
    const { user } = useUser();
    const { profile, activeProfileId, activeAccessLevel } = useUserProfile();
    const firestore = useFirestore();
    const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
    const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || isAdmin;

    const isReadOnly = activeAccessLevel === 'viewer' || activeAccessLevel === 'auditor' || !isPremium;
    
    if (isReadOnly) return null;

    const targetUid = activeProfileId || user?.uid;

    const handleDelete = async () => {
        if (!user || !firestore || !targetUid) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'You must be signed in to perform this action.',
            });
            return;
        }

        const expenseRef = doc(firestore, 'users', targetUid, 'expenses', expense.id);
        deleteDocumentNonBlocking(expenseRef);

        toast({
            title: 'Expense Deleted',
            description: 'The expense entry has been removed.',
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
                        This action cannot be undone. This will permanently delete this expense record from our servers.
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

export function ExpenseList({ expenses, isLoading }: { expenses: Expense[] | null, isLoading: boolean}) {

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!expenses || expenses.length === 0) {
    return (
        <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
            <Archive className="mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">No Expenses Recorded</h3>
            <p>Add your first expense to see your history here.</p>
        </div>
    )
  }

  return (
    <>
        {/* Mobile View: List of Cards */}
    <div className="space-y-4 md:hidden">
        {expenses.map(expense => (
            <Card key={expense.id} className="w-full glass-card shadow-premium border-border/40 overflow-hidden group hover:border-orange-500/50 transition-all duration-500">
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 relative z-10">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{expense.description}</p>
                    <DeleteExpenseButton expense={expense} />
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3 relative z-10">
                    <div className="text-3xl font-black tracking-tighter text-foreground group-hover:text-orange-500 transition-colors">
                        {formatCurrency(expense.amount, expense.currency)}
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[10px] font-bold uppercase tracking-tight">
                                {expense.category}
                            </Badge>
                            {expense.context && (
                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight opacity-70">
                                    {expense.context}
                                </Badge>
                            )}
                            {(expense as any).creatorId && (expense as any).creatorId !== expense.userId && (
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                    <span className="h-1 w-1 rounded-full bg-emerald-500/40" />
                                    👤 {(expense as any).creatorName?.split(' ')[0] || 'Delegate'}
                                </Badge>
                            )}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {new Date((expense.date as any).toDate ? (expense.date as any).toDate() : expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
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
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Description</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Category</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Context</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">Amount</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Date</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {expenses.map(expense => (
                    <TableRow key={expense.id} className="group transition-colors hover:bg-orange-500/5 duration-300 border-b border-border/40 last:border-0">
                        <TableCell className="font-bold text-sm tracking-tight">{expense.description}</TableCell>
                        <TableCell>
                            <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[10px] font-black uppercase tracking-tighter">
                                {expense.category}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-1">
                                {expense.context ? (
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight opacity-50 w-fit">
                                        {expense.context}
                                    </Badge>
                                ) : '-'}
                                {(expense as any).creatorId && (expense as any).creatorId !== expense.userId && (
                                    <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600/60 flex items-center gap-1">
                                        <span className="h-1 w-1 rounded-full bg-emerald-500/40" />
                                        👤 {(expense as any).creatorName?.split(' ')[0] || 'Delegate'}
                                    </div>
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="text-right font-black text-lg tracking-tighter text-foreground group-hover:text-orange-600 transition-colors">
                            {formatCurrency(expense.amount, expense.currency)}
                        </TableCell>
                        <TableCell className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">
                            {new Date((expense.date as any).toDate ? (expense.date as any).toDate() : expense.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <DeleteExpenseButton expense={expense} />
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
