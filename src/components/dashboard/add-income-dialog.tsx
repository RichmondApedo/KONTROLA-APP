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
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { PlusCircle, DollarSign } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { ScrollArea } from '../ui/scroll-area';
import { SingleDatePicker } from '../ui/single-date-picker';

const incomeSchema = z.object({
  name: z.string().min(1, 'Please enter a name for the income source.'),
  amount: z.coerce.number().positive('Please enter a positive amount.'),
  category: z.string().min(1, 'Please enter a category.'),
  date: z.date({ required_error: 'Please enter a valid date.' }),
  context: z.enum(['personal', 'business']).default('personal'),
});

interface AddIncomeDialogProps {
  currency: string;
  plan?: 'free' | 'premium' | 'pro-plus';
  trigger?: React.ReactNode;
}

export function AddIncomeDialog({ currency, plan, trigger }: AddIncomeDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const isProPlus = plan === 'pro-plus';

  const form = useForm<z.infer<typeof incomeSchema>>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      name: '',
      amount: 0,
      category: '',
      date: new Date(),
      context: 'personal',
    },
  });

  const context = form.watch('context');

  const onSubmit = (values: z.infer<typeof incomeSchema>) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be signed in to add income.',
      });
      return;
    }

    addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'incomeSources'), {
        ...values,
        userId: user.uid,
        currency: currency,
        context: isProPlus ? values.context : 'personal',
    });

    toast({
        title: 'Income Added',
        description: 'The new income source has been saved.',
    });
    form.reset();
    setOpen(false);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={setOpen}
      trigger={trigger || <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Income</Button>}
      title="Add Income"
      description="Record a new income entry."
      className="sm:max-w-md"
    >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="max-h-[60vh] md:max-h-[70vh] px-1">
              <div className="space-y-6">
                {isProPlus && (
                    <FormField
                    control={form.control}
                    name="context"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">What is this for?</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-row space-x-4"
                            >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="personal" />
                                </FormControl>
                                <FormLabel className="font-bold text-xs uppercase tracking-tight">Personal</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="business" />
                                </FormControl>
                                <FormLabel className="font-bold text-xs uppercase tracking-tight">Business</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Source Identity</FormLabel>
                      <FormControl>
                        <Input 
                            placeholder={context === 'business' ? "e.g., Enterprise Client A" : "e.g., Primary Salary Overflow"} 
                            {...field} 
                            className="h-12 rounded-xl bg-muted/30 border-border/40 focus:bg-background"
                        />
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
                          <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Gross Inflow</FormLabel>
                          <FormControl>
                             <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="number" placeholder="0.00" {...field} className="pl-9 h-12 rounded-xl bg-muted/30 border-border/40" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date"
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

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Category</FormLabel>
                      <FormControl>
                        <Input 
                            placeholder={context === 'business' ? "e.g., Service Retainer, Product Sale" : "e.g., Dividends, Passive Income"} 
                            {...field} 
                            className="h-12 rounded-xl bg-muted/30 border-border/40"
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
                    {form.formState.isSubmitting ? 'Saving...' : 'Add Income'}
                </Button>
            </div>
          </form>
        </Form>
    </ResponsiveModal>
  );
}
