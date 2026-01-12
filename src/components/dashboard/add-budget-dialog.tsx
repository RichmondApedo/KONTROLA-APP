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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import type { Budget } from '@/lib/types';

const budgetSchema = z.object({
  name: z.string().min(1, 'Please enter a name for the budget.'),
  amount: z.coerce.number().positive('Please enter a positive amount.'),
  category: z.string().min(1, 'Please enter a category.'),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
});

interface AddBudgetDialogProps {
  currency: string;
  budget?: Budget;
  children: React.ReactNode;
}

export function AddBudgetDialog({ currency, budget, children }: AddBudgetDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const isEditMode = !!budget;

  const form = useForm<z.infer<typeof budgetSchema>>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: '',
      amount: 0,
      category: 'Overall',
      period: 'monthly',
    },
  });

  useEffect(() => {
    if (budget && open) {
        form.reset({
            name: budget.name,
            amount: budget.amount,
            category: budget.category,
            period: budget.period,
        });
    } else if (!isEditMode && open) {
        form.reset({
          name: '',
          amount: 0,
          category: 'Overall',
          period: 'monthly',
        });
    }
  }, [budget, open, form, isEditMode]);


  const getPeriodDates = (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    const now = new Date();
    switch (period) {
      case 'daily':
        return { startDate: startOfDay(now), endDate: endOfDay(now) };
      case 'weekly':
        return { startDate: startOfWeek(now), endDate: endOfWeek(now) };
      case 'monthly':
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case 'yearly':
        return { startDate: startOfYear(now), endDate: endOfYear(now) };
    }
  };

  const onSubmit = async (values: z.infer<typeof budgetSchema>) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be signed in to manage budgets.',
      });
      return;
    }

    try {
      const { startDate, endDate } = getPeriodDates(values.period as 'daily' | 'weekly' | 'monthly' | 'yearly');
      const budgetData = {
        ...values,
        userId: user.uid,
        currency: currency,
        startDate: startDate,
        endDate: endDate,
      };

      if (isEditMode && budget.id) {
        const budgetDoc = doc(firestore, 'users', user.uid, 'budgets', budget.id);
        await setDocumentNonBlocking(budgetDoc, budgetData, { merge: true });
        toast({
          title: 'Budget Updated',
          description: 'Your budget has been successfully updated.',
        });
      } else {
        const budgetCollection = collection(firestore, 'users', user.uid, 'budgets');
        await addDocumentNonBlocking(budgetCollection, budgetData);
        toast({
          title: 'Budget Added',
          description: 'The new budget has been created.',
        });
      }

      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error saving budget:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save budget. Please try again.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Budget' : 'Create a New Budget'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details of your budget.' : 'Set a spending limit for a specific category and period.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly Groceries" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 400" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Groceries, Entertainment" {...field} />
                  </FormControl>
                   <FormDescription>
                     Use 'Overall' for a total spending budget.
                   </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a budget period" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
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
                {form.formState.isSubmitting ? 'Saving...' : 'Save Budget'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
