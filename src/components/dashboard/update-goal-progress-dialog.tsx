'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, increment, type FieldValue } from 'firebase/firestore';
import type { SavingsGoal } from '@/lib/types';
import { MinusCircle, PlusCircle } from 'lucide-react';

const updateGoalSchema = z.object({
  amount: z.coerce.number().positive('Please enter a positive amount.'),
});

interface UpdateGoalProgressDialogProps {
  children: React.ReactNode;
  goal: SavingsGoal;
}

export function UpdateGoalProgressDialog({ children, goal }: UpdateGoalProgressDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof updateGoalSchema>>({
    resolver: zodResolver(updateGoalSchema),
    defaultValues: {
      amount: 0,
    },
  });

  const handleUpdate = async (amount: number) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be signed in.' });
      return;
    }
    const parsedAmount = form.getValues('amount');
    if (!parsedAmount || parsedAmount <= 0) {
        form.setError("amount", { type: "manual", message: "Please enter a positive amount." });
        return;
    }

    try {
      const goalRef = doc(firestore, 'users', user.uid, 'savingsGoals', goal.id);
      
      const newCurrentAmount = goal.currentAmount + amount;
      if (newCurrentAmount < 0) {
        toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Savings cannot go below zero.' });
        return;
      }
      
      const updateData: { currentAmount: FieldValue; lastContributionDate?: Date } = {
        currentAmount: increment(amount)
      };

      if (amount > 0) {
        updateData.lastContributionDate = new Date();
      }

      updateDocumentNonBlocking(goalRef, updateData);

      toast({
        title: 'Goal Updated',
        description: `Your progress for "${goal.name}" has been updated.`,
      });

      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error updating savings goal:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not update your goal. Please try again.',
      });
    }
  };

  const onSubmit = (values: z.infer<typeof updateGoalSchema>) => {
    handleUpdate(values.amount);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Progress: {goal.name}</DialogTitle>
          <DialogDescription>
            Add or withdraw funds from your savings goal.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ({goal.currency.toUpperCase()})</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
              <Button
                type="button"
                variant="outline"
                disabled={form.formState.isSubmitting}
                onClick={() => handleUpdate(-form.getValues('amount'))}
              >
                <MinusCircle /> Withdraw
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <PlusCircle /> Add to Savings
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
