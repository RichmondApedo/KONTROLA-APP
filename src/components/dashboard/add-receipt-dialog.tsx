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
import { useCollection, useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc, increment } from 'firebase/firestore';
import type { Customer } from '@/lib/types';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { SingleDatePicker } from '../ui/single-date-picker';

const receiptSchema = z.object({
  customerId: z.string().min(1, 'Please select a customer.'),
  amountPaid: z.coerce.number().positive('Please enter a positive amount.'),
  paymentDate: z.date({ required_error: 'Please enter a valid date.' }),
  paymentMethod: z.string().min(1, 'Please enter a payment method.'),
  description: z.string().min(1, 'Please enter a description for the payment.'),
});

interface AddReceiptDialogProps {
  currency: string;
  children: React.ReactNode;
}

export function AddReceiptDialog({ currency, children }: AddReceiptDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const customersQuery = useMemo(() => user && firestore ? collection(firestore, 'users', user.uid, 'customers') : null, [user, firestore]);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

  const form = useForm<z.infer<typeof receiptSchema>>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      customerId: '',
      amountPaid: 0,
      paymentDate: new Date(),
      paymentMethod: 'Cash',
      description: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof receiptSchema>) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be signed in.' });
      return;
    }

    try {
      const receiptData = {
        ...values,
        userId: user.uid,
        currency: currency,
        receiptNumber: `RCPT-${Date.now().toString().slice(-6)}`,
      };

      const receiptCollection = collection(firestore, 'users', user.uid, 'receipts');
      addDocumentNonBlocking(receiptCollection, receiptData);

      const customerRef = doc(firestore, 'users', user.uid, 'customers', values.customerId);
      updateDocumentNonBlocking(customerRef, {
        totalRevenue: increment(values.amountPaid),
        lastPurchaseDate: values.paymentDate,
      });

      toast({ title: 'Receipt Created', description: 'The new receipt and customer sales data have been saved.' });

      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error saving receipt:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save receipt. Please try again.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Standalone Receipt</DialogTitle>
          <DialogDescription>
            Record a payment that is not associated with an invoice.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 pt-1">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={customersLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers ? customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>) : <SelectItem value="loading" disabled>Loading...</SelectItem>}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amountPaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Paid</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 100.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Down payment for project X" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Bank Transfer, Cash" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col pb-2">
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <SingleDatePicker
                            date={field.value}
                            onDateChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4 pt-4 border-t">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Receipt'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
