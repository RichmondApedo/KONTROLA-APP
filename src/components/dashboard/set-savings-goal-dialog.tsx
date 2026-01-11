'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
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
import { useState, useEffect } from 'react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import type { SavingsGoal } from '@/lib/types';

const goalSchema = z.object({
  name: z.string().min(1, 'Please enter a name for your goal.'),
  targetAmount: z.coerce.number().positive('Please enter a positive amount.'),
});

interface SetSavingsGoalDialogProps {
  children: React.ReactNode;
  currentGoal?: SavingsGoal | null;
  currency: string;
}

export function SetSavingsGoalDialog({ children, currentGoal, currency }: SetSavingsGoalDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      targetAmount: 0,
    },
  });

  useEffect(() => {
    if (currentGoal) {
      form.reset({
        name: currentGoal.name,
        targetAmount: currentGoal.targetAmount,
      });
    }
  }, [currentGoal, form]);

  const onSubmit = async (values: z.infer<typeof goalSchema>) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be signed in to set a goal.',
      });
      return;
    }

    try {
      const goalId = currentGoal?.id || 'main';
      const goalRef = doc(firestore, 'users', user.uid, 'savingsGoals', goalId);

      setDocumentNonBlocking(goalRef, {
        id: goalId,
        userId: user.uid,
        currency: currency,
        ...values,
      }, { merge: true });

      toast({
        title: 'Savings Goal Updated',
        description: 'Your new goal has been set.',
      });
      setOpen(false);
    } catch (error) {
      console.error('Error setting savings goal:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save your goal. Please try again.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{currentGoal ? 'Edit' : 'Set'} Your Savings Goal</DialogTitle>
          <DialogDescription>
            Define your target and track your progress.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., New Car Fund" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Amount ({currency.toUpperCase()})</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 20000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Goal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
