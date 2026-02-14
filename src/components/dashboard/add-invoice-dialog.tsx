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
import { useEffect, useState, useMemo } from 'react';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc, serverTimestamp, query } from 'firebase/firestore';
import type { Customer, Invoice } from '@/lib/types';
import { Textarea } from '../ui/textarea';

const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Please select a customer.'),
  description: z.string().min(1, 'Please enter a description.'),
  amount: z.coerce.number().positive('Please enter a positive amount.'),
  dueDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Please enter a valid date.',
  }),
});

interface AddInvoiceDialogProps {
  invoice?: Invoice;
  currency: string;
  children: React.ReactNode;
}

export function AddInvoiceDialog({ invoice, currency, children }: AddInvoiceDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const isEditMode = !!invoice;
  
  const customersQuery = useMemo(() => user && firestore ? query(collection(firestore, 'users', user.uid, 'customers')) : null, [user, firestore]);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      description: '',
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (invoice && open) {
        const invoiceDueDate = (invoice.dueDate as any).toDate ? (invoice.dueDate as any).toDate() : new Date(invoice.dueDate);
        form.reset({
            customerId: invoice.customerId,
            description: invoice.description,
            amount: invoice.amount,
            dueDate: invoiceDueDate.toISOString().split('T')[0],
        });
    } else if (!isEditMode && open) {
        form.reset({
            customerId: '',
            description: '',
            amount: 0,
            dueDate: new Date().toISOString().split('T')[0],
        });
    }
  }, [invoice, open, form, isEditMode]);

  const onSubmit = async (values: z.infer<typeof invoiceSchema>) => {
    if (!user || !firestore || !customers) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save invoice. Please try again.' });
      return;
    }

    const selectedCustomer = customers.find(c => c.id === values.customerId);
    if (!selectedCustomer) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected customer not found.' });
        return;
    }

    try {
      const invoiceData = {
        ...values,
        userId: user.uid,
        customerName: selectedCustomer.name,
        currency,
        issueDate: new Date(),
        dueDate: new Date(values.dueDate),
        status: invoice?.status || 'draft',
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`, // Simple invoice number
      };
        
      if (isEditMode && invoice.id) {
        const invoiceDoc = doc(firestore, 'users', user.uid, 'invoices', invoice.id);
        await setDocumentNonBlocking(invoiceDoc, invoiceData, { merge: true });
        toast({ title: 'Invoice Updated', description: 'The invoice has been successfully updated.' });
      } else {
        const invoiceCollection = collection(firestore, 'users', user.uid, 'invoices');
        await addDocumentNonBlocking(invoiceCollection, invoiceData);
        toast({ title: 'Invoice Created', description: 'The new invoice has been saved as a draft.' });
      }

      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save invoice. Please try again.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this invoice.' : 'Create an invoice for a customer.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Web Design Services" {...field} />
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
                  <FormLabel>Amount ({currency.toUpperCase()})</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 1200.00" {...field} />
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

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
