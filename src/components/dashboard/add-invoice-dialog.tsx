'use client';

import { ResponsiveModal } from '@/components/ui/responsive-modal';
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
import { SingleDatePicker } from '../ui/single-date-picker';


const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description cannot be empty.'),
  quantity: z.coerce.number().min(1, 'Qty must be at least 1.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Please select a customer.'),
  dueDate: z.date({ required_error: 'Please enter a valid date.' }),
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
      dueDate: new Date(),
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
            dueDate: invoiceDueDate,
            items: invoice.items,
        });
    } else if (!isEditMode && open) {
        form.reset({
            customerId: '',
            dueDate: new Date(),
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
        dueDate: values.dueDate,
        status: invoice?.status || 'draft',
        invoiceNumber: invoice?.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        items: values.items,
        totalAmount: finalTotalAmount,
        customerPhone: selectedCustomer.phone,
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
    <ResponsiveModal
      open={open}
      onOpenChange={setOpen}
      trigger={children}
      title={isEditMode ? 'Edit Invoice' : 'Create Invoice'}
      description="Record a new transaction for a customer."
      className="sm:max-w-xl"
    >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <ScrollArea className="max-h-[60vh] md:max-h-[70vh] px-1">
                <div className="space-y-6">
                  <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Customer</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={customersLoading}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-border/40">
                                  <SelectValue placeholder="Choose a customer" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="glass-card shadow-premium border-border/40">
                                {customers ? customers.map(c => <SelectItem key={c.id} value={c.id} className="font-bold text-xs">{c.name}</SelectItem>) : <SelectItem value="loading" disabled>Loading...</SelectItem>}
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
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Creation Date</FormLabel>
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

                  <div className="pt-2">
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Invoice Items</FormLabel>
                    <div className="space-y-4 mt-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="relative space-y-3 p-4 rounded-2xl bg-muted/30 border border-border/50 group/item transition-all duration-300 hover:bg-muted/50">
                          <div className="grid grid-cols-12 gap-3 items-start">
                            <FormField
                              control={form.control}
                              name={`items.${index}.description`}
                              render={({ field }) => (
                                <FormItem className="col-span-12 sm:col-span-12">
                                  <FormLabel className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Description</FormLabel>
                                  <FormControl>
                                    <Input placeholder="What are you billing for?" {...field} className="bg-background/50 border-border/40 focus:bg-background" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem className="col-span-4 sm:col-span-3">
                                  <FormLabel className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Qty</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="0" {...field} className="bg-background/50 border-border/40 focus:bg-background" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.price`}
                              render={({ field }) => (
                                <FormItem className="col-span-5 sm:col-span-4">
                                   <FormLabel className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Unit Price</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.01" placeholder="0.00" {...field} className="bg-background/50 border-border/40 focus:bg-background" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <div className="col-span-3 sm:col-span-5 text-right flex flex-col justify-end h-full pb-2">
                                <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground mb-1">Total</span>
                                <p className="font-black text-sm tracking-tight text-primary">
                                    {formatCurrency((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.price || 0), currency)}
                                </p>
                             </div>
                          </div>
                          
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover/item:opacity-100 transition-opacity shadow-sm border border-destructive/20 hover:bg-destructive hover:text-white"
                            disabled={fields.length <= 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ description: '', quantity: 1, price: 0 })}
                        className="w-full h-11 rounded-xl border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-300"
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Append Line Item
                      </Button>
                      <FormMessage>{form.formState.errors.items?.root?.message}</FormMessage>
                    </div>
                  </div>
              </div>
            </ScrollArea>
             <div className="pt-4 border-t border-border/40">
                <div className="flex justify-between items-center bg-primary/5 p-4 rounded-2xl border border-primary/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aggregate Amount</span>
                    <span className="text-2xl font-black tracking-tighter text-primary">{formatCurrency(totalAmount, currency)}</span>
                </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-12 rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 rounded-xl font-black bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
                    {form.formState.isSubmitting ? 'Saving...' : 'Create Invoice'}
                </Button>
            </div>
          </form>
        </Form>
    </ResponsiveModal>
  );
}
