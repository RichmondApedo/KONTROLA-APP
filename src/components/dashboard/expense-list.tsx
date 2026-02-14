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
import type { Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2 } from 'lucide-react';
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

        const expenseRef = doc(firestore, 'users', user.uid, 'expenses', expense.id);
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
        <div className="text-center text-muted-foreground py-8">
            No expenses recorded yet.
        </div>
    )
  }

  return (
    <>
        {/* Mobile View: List of Cards */}
        <div className="space-y-4 md:hidden">
            {expenses.map(expense => (
                <Card key={expense.id} className="w-full">
                    <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
                        <p className="font-medium">{expense.description}</p>
                        <DeleteExpenseButton expense={expense} />
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                        <p className="text-2xl font-bold text-destructive">
                            {formatCurrency(expense.amount, expense.currency)}
                        </p>
                        <div className="flex items-center justify-between text-muted-foreground text-sm">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline">{expense.category}</Badge>
                                {expense.context && <Badge variant="secondary" className="capitalize">{expense.context}</Badge>}
                            </div>
                            <span>
                                {new Date((expense.date as any).toDate ? (expense.date as any).toDate() : expense.date).toLocaleDateString()}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>

        {/* Desktop View: Table */}
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
                    {expenses.map(expense => (
                    <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell>
                            <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                         <TableCell>
                            {expense.context ? <Badge variant="secondary" className="capitalize">{expense.context}</Badge> : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                        {formatCurrency(expense.amount, expense.currency)}
                        </TableCell>
                        <TableCell>
                        {new Date((expense.date as any).toDate ? (expense.date as any).toDate() : expense.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                            <DeleteExpenseButton expense={expense} />
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </>
  );
}
