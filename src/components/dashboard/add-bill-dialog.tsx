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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFirestore, useUser, useUserProfile } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import type { Bill } from '@/lib/types';
import { Switch } from '../ui/switch';
import { ScrollArea } from '../ui/scroll-area';
import { SingleDatePicker } from '../ui/single-date-picker';
import { Calendar, RefreshCcw } from 'lucide-react';
import { CurrencyIcon } from './currency-symbol';

const billSchema = z.object({
  name: z.string().min(1, 'Please enter a name for the bill.'),
  amount: z.coerce.number().positive('Please enter a positive amount.'),
  dueDate: z.date({ required_error: 'Please enter a valid date.' }),
  isRecurring: z.boolean().default(false),
  context: z.enum(['personal', 'business']).default('personal'),
});

interface AddBillDialogProps {
  currency: string;
  bill?: Bill;
  children: React.ReactNode;
}

export function AddBillDialog({ currency, bill, children }: AddBillDialogProps) {
  const { user } = useUser();
  const { activeProfileId } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const targetUid = activeProfileId || user?.uid;

  const isEditMode = !!bill;

  const form = useForm<z.infer<typeof billSchema>>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      name: '',
      amount: 0,
      dueDate: new Date(),
      isRecurring: false,
      context: 'personal',
    },
  });

  useEffect(() => {
    if (bill && open) {
        const billDate = (bill.dueDate as any).toDate ? (bill.dueDate as any).toDate() : new Date(bill.dueDate);
        form.reset({
            name: bill.name,
            amount: bill.amount,
            dueDate: billDate,
            isRecurring: bill.isRecurring,
            context: bill.context || 'personal',
        });
    } else if (!isEditMode && open) {
        form.reset({
            name: '',
            amount: 0,
            dueDate: new Date(),
            isRecurring: false,
            context: 'personal',
        });
    }
  }, [bill, open, form, isEditMode]);

  const onSubmit = async (values: z.infer<typeof billSchema>) => {
    if (!user || !firestore || !targetUid) {
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
        userId: targetUid,
        currency: currency,
        status: bill?.status || 'unpaid',
        creatorId: user.uid,
        creatorName: profile?.name || user.displayName || user.email?.split('@')[0] || 'Unknown',
        creatorEmail: user.email,
      };

      if (isEditMode && bill.id) {
        const billDoc = doc(firestore, 'users', targetUid, 'bills', bill.id);
        setDocumentNonBlocking(billDoc, billData, { merge: true });
        toast({
          title: 'Bill Updated',
          description: 'Your bill has been successfully updated.',
        });
      } else {
        const billCollection = collection(firestore, 'users', targetUid, 'bills');
        addDocumentNonBlocking(billCollection, billData);
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
    <ResponsiveModal
      open={open}
      onOpenChange={setOpen}
      trigger={children}
      title={isEditMode ? 'Edit Bill' : 'Track New Bill'}
      description={isEditMode ? 'Modify the parameters of your liability.' : 'Monitor an upcoming financial obligation.'}
      className="sm:max-w-md"
    >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="space-y-4">
                <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="context"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Finance Context</FormLabel>
                        <FormControl>
                            <Tabs 
                                onValueChange={field.onChange} 
                                defaultValue={field.value} 
                                className="w-full"
                            >
                                <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/50 p-1 h-12">
                                    <TabsTrigger value="personal" className="rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                        👤 Personal
                                    </TabsTrigger>
                                    <TabsTrigger value="business" className="rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                        🏢 Business
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Bill Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Enterprise Cloud, Office Utility" {...field} className="h-12 rounded-xl bg-muted/30 border-border/40 focus:bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Amount ({currency.toUpperCase()})</FormLabel>
                          <FormControl>
                             <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded bg-muted/50 border border-border/50">
                                    <CurrencyIcon currency={currency} className="h-2.5 w-2.5" />
                                </div>
                                <Input type="number" placeholder="0.00" {...field} className="pl-9 h-12 rounded-xl bg-muted/30 border-border/40" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Category</FormLabel>
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

                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-primary/10 p-4 bg-muted/20 shadow-inner group/switch">
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover/switch:bg-primary/20 transition-colors">
                            <RefreshCcw className="h-4 w-4 text-primary" />
                         </div>
                         <div className="space-y-0.5">
                            <FormLabel className="text-[11px] font-black uppercase tracking-widest">Recurring Cycle</FormLabel>
                            <p className="text-[9px] font-medium text-muted-foreground leading-none">Enable for automated tracking</p>
                         </div>
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
              </div>
             </div>
             <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-12 rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 rounded-xl font-black bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
                    {form.formState.isSubmitting ? 'Saving...' : 'Add Bill'}
                </Button>
            </div>
          </form>
        </Form>
    </ResponsiveModal>
  );
}
