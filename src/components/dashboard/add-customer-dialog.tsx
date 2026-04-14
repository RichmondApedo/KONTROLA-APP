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
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import type { Customer } from '@/lib/types';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { User, Mail, Phone, MapPin, Notebook } from 'lucide-react';

const customerSchema = z.object({
  name: z.string().min(2, 'Please enter a name.'),
  email: z.string().email('Please enter a valid email.').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

interface AddCustomerDialogProps {
  customer?: Customer;
  children: React.ReactNode;
}

export function AddCustomerDialog({ customer, children }: AddCustomerDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const isEditMode = !!customer;

  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (customer && open) {
        form.reset({
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            notes: customer.notes,
        });
    } else if (!isEditMode && open) {
        form.reset({
            name: '',
            email: '',
            phone: '',
            address: '',
            notes: '',
        });
    }
  }, [customer, open, form, isEditMode]);

  const onSubmit = async (values: z.infer<typeof customerSchema>) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be signed in to manage customers.',
      });
      return;
    }

    try {
      if (isEditMode && customer.id) {
        const customerDoc = doc(firestore, 'users', user.uid, 'customers', customer.id);
        updateDocumentNonBlocking(customerDoc, values);
        toast({
          title: 'Profile Updated',
          description: 'Entity metadata has been successfully synchronized.',
        });
      } else {
        const customerCollection = collection(firestore, 'users', user.uid, 'customers');
        addDocumentNonBlocking(customerCollection, {
            ...values,
            userId: user.uid,
            createdAt: serverTimestamp(),
            totalRevenue: 0,
        });
        toast({
          title: 'Entity Registered',
          description: 'A new node has been added to the customer network.',
        });
      }

      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save customer. Please try again.',
      });
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={setOpen}
      trigger={children}
      title={isEditMode ? 'Edit Customer' : 'Add Customer'}
      description={isEditMode ? 'Update the details for this customer.' : 'Add a new customer to your database.'}
      className="sm:max-w-md"
    >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="e.g., Enterprise Solutions Ltd" {...field} className="pl-9 h-12 rounded-xl bg-muted/30 border-border/40 focus:bg-background" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="email" placeholder="client@hub.com" {...field} className="pl-9 h-12 rounded-xl bg-muted/30 border-border/40" />
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Phone Number</FormLabel>
                        <FormControl>
                             <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="tel" placeholder="+233..." {...field} className="pl-9 h-12 rounded-xl bg-muted/30 border-border/40" />
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                             <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                             <Textarea placeholder="e.g., HQ, 4th Floor, Innovation Square" {...field} className="pl-9 min-h-[80px] rounded-xl bg-muted/30 border-border/40 resize-none" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notes</FormLabel>
                      <FormControl>
                        <div className="relative">
                            <Notebook className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Textarea placeholder="e.g., Prefers async communication via encrypted channels." {...field} className="pl-9 min-h-[80px] rounded-xl bg-muted/30 border-border/40 resize-none" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

             <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-12 rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 rounded-xl font-black bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
                    {form.formState.isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add Customer')}
                </Button>
            </div>
          </form>
        </Form>
    </ResponsiveModal>
  );
}
