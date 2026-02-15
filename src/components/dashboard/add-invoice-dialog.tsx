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
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import type { Customer, Invoice } from '@/lib/types';
import { PlusCircle, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';


const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description cannot be empty.'),
  quantity: z.coerce.number().min(1, 'Qty must be at least 1.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Please select a customer.'),
  dueDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Please enter a valid date.',
  }),
  items: z.array(invoiceItemSchema).min(1, 'Please add at least one item.'),
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
  
  const customersQuery = useMemo(() => user && firestore ? collection(firestore, 'users', user.uid, 'customers') : null, [user, firestore]);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      dueDate: new Date().toISOString().split('T')[0],
      items: [{ description: '', quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch('items');
  const totalAmount = useMemo(() => {
    return watchedItems.reduce((acc, item) => acc + (item.quantity || 0) * (item.price || 0), 0);
  }, [watchedItems]);

  useEffect(() => {
    if (invoice && open) {
        const invoiceDueDate = (invoice.dueDate as any).toDate ? (invoice.dueDate as any).toDate() : new Date(invoice.dueDate);
        form.reset({
            customerId: invoice.customerId,
            dueDate: invoiceDueDate.toISOString().split('T')[0],
            items: invoice.items,
        });
    } else if (!isEditMode && open) {
        form.reset({
            customerId: '',
            dueDate: new Date().toISOString().split('T')[0],
            items: [{ description: '', quantity: 1, price: 0 }],
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

    const finalTotalAmount = values.items.reduce((acc, item) => acc + item.quantity * item.price, 0);

    try {
      const invoiceData = {
        userId: user.uid,
        customerId: values.customerId,
        customerName: selectedCustomer.name,
        currency,
        issueDate: isEditMode && invoice ? invoice.issueDate : new Date(),
        dueDate: new Date(values.dueDate),
        status: invoice?.status || 'draft',
        invoiceNumber: invoice?.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        items: values.items,
        totalAmount: finalTotalAmount,
      };
        
      if (isEditMode && invoice.id) {
        const invoiceDoc = doc(firestore, 'users', user.uid, 'invoices', invoice.id);
        setDocumentNonBlocking(invoiceDoc, invoiceData, { merge: true });
        toast({ title: 'Invoice Updated', description: 'The invoice has been successfully updated.' });
      } else {
        const invoiceCollection = collection(firestore, 'users', user.uid, 'invoices');
        addDocumentNonBlocking(invoiceCollection, invoiceData);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this invoice.' : 'Create an invoice for a customer.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
             <ScrollArea className="h-[60vh] pr-6">
                <div className="space-y-4">
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

                  <div>
                    <FormLabel>Items</FormLabel>
                    <div className="space-y-3 mt-2">
                      {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-2 items-start border p-3 rounded-lg">
                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem className="col-span-12 sm:col-span-5">
                                <FormLabel className="sr-only">Description</FormLabel>
                                <FormControl>
                                  <Input placeholder="Item description" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem className="col-span-4 sm:col-span-2">
                                <FormLabel className="sr-only">Quantity</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="Qty" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.price`}
                            render={({ field }) => (
                              <FormItem className="col-span-5 sm:col-span-3">
                                 <FormLabel className="sr-only">Price</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="Price" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                           <p className="col-span-2 sm:col-span-1 text-right pt-2 font-medium">
                               {formatCurrency((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.price || 0), currency)}
                            </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="col-span-1"
                            disabled={fields.length <= 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ description: '', quantity: 1, price: 0 })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Item
                      </Button>
                      <FormMessage>{form.formState.errors.items?.root?.message}</FormMessage>
                    </div>
                  </div>
              </div>
            </ScrollArea>
             <div className="mt-6 border-t pt-4 pr-6">
                <div className="flex justify-end items-center gap-4">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="text-2xl font-bold">{formatCurrency(totalAmount, currency)}</span>
                </div>
            </div>
            <DialogFooter className="mt-6 pr-6">
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
