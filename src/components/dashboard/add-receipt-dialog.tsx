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
import { Receipt, User, DollarSign, Calendar, CreditCard, Notebook } from 'lucide-react';

const receiptSchema = z.object({
  customerId: z.string().min(1, 'Please select a customer.'),
  amountPaid: z.coerce.number().positive('Please enter a positive amount.'),
  paymentDate: z.date({ required_error: 'Please enter a valid date.' }),
  paymentMethod: z.string().min(1, 'Please enter a payment method.'),
  description: z.string().min(1, 'Please enter a description.'),
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

      toast({ title: 'Receipt Saved', description: 'Transaction record and customer sales data have been updated.' });

      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error saving receipt:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save receipt.' });
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={setOpen}
      trigger={children}
      title="Add Receipt"
      description="Record a payment from a customer."
      className="sm:max-w-md"
    >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="max-h-[60vh] md:max-h-[70vh] px-1">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Customer</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={customersLoading}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-border/40">
                             <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <SelectValue placeholder="Choose a customer" />
                             </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="glass-card border-border/40">
                          {customers ? customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>) : <SelectItem value="loading" disabled>Syncing nodes...</SelectItem>}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="amountPaid"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Amount ({currency.toUpperCase()})</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="number" step="0.01" placeholder="0.00" {...field} className="pl-9 h-12 rounded-xl bg-muted/30 border-border/40" />
                            </div>
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
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Method</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="e.g., Wire, Crypto" {...field} className="pl-9 h-12 rounded-xl bg-muted/30 border-border/40" />
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Description</FormLabel>
                      <FormControl>
                        <div className="relative">
                            <Notebook className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Textarea placeholder="e.g., Strategic service procurement fee" {...field} className="pl-9 min-h-[80px] rounded-xl bg-muted/30 border-border/40 resize-none" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Date</FormLabel>
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
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-12 rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 rounded-xl font-black bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
                    {form.formState.isSubmitting ? 'Saving...' : 'Save Receipt'}
                </Button>
            </div>
          </form>
        </Form>
    </ResponsiveModal>
  );
}
