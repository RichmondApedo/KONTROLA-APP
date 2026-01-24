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
import { ExpenseChart } from '@/components/dashboard/expense-chart';
import { AddExpenseDialog } from '@/components/dashboard/add-expense-dialog';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, orderBy, query, doc, runTransaction } from 'firebase/firestore';
import type { Expense, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
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
        const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const userProfileDoc = await transaction.get(profileRef);
                if (!userProfileDoc.exists()) {
                    throw new Error("User profile not found!");
                }
                
                const userProfile = userProfileDoc.data() as UserProfile;
                const newTotalBalance = (userProfile.totalBalance || 0) + expense.amount;

                transaction.delete(expenseRef);
                transaction.update(profileRef, { totalBalance: newTotalBalance });
            });

            toast({
                title: 'Expense Deleted',
                description: 'The expense entry has been removed.',
            });
        } catch (error) {
            console.error('Error deleting expense:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not delete expense. Please try again.',
            });
        }
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

function ExpenseList() {
  const { user } = useUser();
  const firestore = useFirestore();

  const expensesQuery = useMemo(() =>
    user && firestore
      ? query(
          collection(firestore, 'users', user.uid, 'expenses'),
          orderBy('date', 'desc')
        )
      : null,
      [user, firestore]
  );
  
  const { data: expenses, isLoading } = useCollection<Expense>(expensesQuery);

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-2">
        <Skeleton className="h-24 w-full md:h-10" />
        <Skeleton className="h-24 w-full md:h-10" />
        <Skeleton className="h-24 w-full md:h-10" />
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
                    <CardContent className="flex items-start justify-between p-4">
                        <div className="flex-1 space-y-1.5 pr-4">
                            <p className="truncate font-medium">{expense.description}</p>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{expense.category}</Badge>
                                {expense.context && <Badge variant="secondary" className="capitalize">{expense.context}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {new Date((expense.date as any).toDate ? (expense.date as any).toDate() : expense.date).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="flex flex-col items-end text-right">
                            <p className="whitespace-nowrap font-bold text-destructive">
                                {formatCurrency(expense.amount, expense.currency)}
                            </p>
                            <div className="-mb-2 -mr-2">
                                <DeleteExpenseButton expense={expense} />
                            </div>
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

export default function ExpensesPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile } = useDoc<UserProfile>(profileDocRef);


  return (
    <div className="grid gap-6 md:grid-cols-5">
      <div className="md:col-span-3 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">
              Expenses
            </h1>
            <p className="text-muted-foreground">
              Track and manage your daily spending.
            </p>
          </div>
          <AddExpenseDialog currency={profile?.preferredCurrency || 'USD'} plan={profile?.plan} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expense History</CardTitle>
            <CardDescription>
              A list of all your recorded expenses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseList />
          </CardContent>
        </Card>
      </div>
      <div className="md:col-span-2">
        <ExpenseChart currency={profile?.preferredCurrency || 'USD'} />
      </div>
    </div>
  );
}
