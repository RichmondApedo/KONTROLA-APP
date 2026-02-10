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
import { useEffect, useState } from 'react';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import type { Bill } from '@/lib/types';
import { Switch } from '../ui/switch';

const billSchema = z.object({
  name: z.string().min(1, 'Please enter a name for the bill.'),
  amount: z.coerce.number().positive('Please enter a positive amount.'),
  dueDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Please enter a valid date.',
  }),
  isRecurring: z.boolean().default(false),
});

interface AddBillDialogProps {
  currency: string;
  bill?: Bill;
  children: React.ReactNode;
}

export function AddBillDialog({ currency, bill, children }: AddBillDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const isEditMode = !!bill;

  const form = useForm<z.infer<typeof billSchema>>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      name: '',
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      isRecurring: false,
    },
  });

  useEffect(() => {
    if (bill && open) {
        const billDate = (bill.dueDate as any).toDate ? (bill.dueDate as any).toDate() : new Date(bill.dueDate);
        form.reset({
            name: bill.name,
            amount: bill.amount,
            dueDate: billDate.toISOString().split('T')[0],
            isRecurring: bill.isRecurring,
        });
    } else if (!isEditMode && open) {
        form.reset({
            name: '',
            amount: 0,
            dueDate: new Date().toISOString().split('T')[0],
            isRecurring: false,
        });
    }
  }, [bill, open, form, isEditMode]);

  const onSubmit = async (values: z.infer<typeof billSchema>) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be signed in to manage bills.',
      });
      return;
    }

    try {
      const billData = {
        ...values,
        userId: user.uid,
        currency: currency,
        dueDate: new Date(values.dueDate),
        status: bill?.status || 'unpaid',
      };

      if (isEditMode && bill.id) {
        const billDoc = doc(firestore, 'users', user.uid, 'bills', bill.id);
        await setDocumentNonBlocking(billDoc, billData, { merge: true });
        toast({
          title: 'Bill Updated',
          description: 'Your bill has been successfully updated.',
        });
      } else {
        const billCollection = collection(firestore, 'users', user.uid, 'bills');
        await addDocumentNonBlocking(billCollection, billData);
        toast({
          title: 'Bill Added',
          description: 'The new bill has been created.',
        });
      }

      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error saving bill:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save bill. Please try again.',
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
          <DialogTitle>{isEditMode ? 'Edit Bill' : 'Add a New Bill'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details of your bill.' : 'Track a new upcoming or recurring bill.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bill Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Netflix Subscription" {...field} />
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
                    <Input type="number" placeholder="e.g., 15.99" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Recurring Bill</FormLabel>
                    <DialogDescription>
                      Is this a recurring monthly bill?
                    </DialogDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                {form.formState.isSubmitting ? 'Saving...' : 'Save Bill'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
