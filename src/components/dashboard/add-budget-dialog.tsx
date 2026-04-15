'use client';

import { ResponsiveModal } from '@/components/ui/responsive-modal';
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
import { useFirestore, useUser, useUserProfile } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import type { Budget } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { DollarSign, PieChart, Clock } from 'lucide-react';

const budgetSchema = z.object({
  name: z.string().min(1, 'Please enter a name for the budget.'),
  amount: z.coerce.number().positive('Please enter a positive amount.'),
  category: z.string().min(1, 'Please select a category.'),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
});

const budgetCategories = [
    'Overall',
    // Physiological Needs
    'Rent',
    'Food',
    'Water Bills',
    'ECG Bills',
    // Safety Needs
    'Health',
    'Transport',
    'Household',
    // Social & Esteem Needs
    'Shopping',
    'Entertainment',
    'Church Contributions',
    'Funeral Donations',
    // Self-Actualization
    'Education',
    'Other',
];

interface AddBudgetDialogProps {
  currency: string;
  budget?: Budget;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  suggestion?: {
      category: string;
      amount: number;
      period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  };
}

export function AddBudgetDialog({ currency, budget, children, open: controlledOpen, onOpenChange: setControlledOpen, suggestion }: AddBudgetDialogProps) {
  const { user } = useUser();
  const { activeProfileId } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const targetUid = activeProfileId || user?.uid;
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;

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
    if (open) {
        if (suggestion) {
            form.reset({
                name: `${suggestion.category} Budget`,
                amount: suggestion.amount,
                category: suggestion.category,
                period: suggestion.period,
            });
        } else if (budget) {
            form.reset({
                name: budget.name,
                amount: budget.amount,
                category: budget.category,
                period: budget.period,
            });
        } else {
            form.reset({
              name: '',
              amount: 0,
              category: 'Overall',
              period: 'monthly',
            });
        }
    }
  }, [budget, open, form, suggestion]);


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
    if (!user || !firestore || !targetUid) {
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
        userId: targetUid,
        currency: currency,
        startDate: startDate,
        endDate: endDate,
      };

      if (isEditMode && budget.id) {
        const budgetDoc = doc(firestore, 'users', targetUid, 'budgets', budget.id);
        setDocumentNonBlocking(budgetDoc, budgetData, { merge: true });
        toast({
          title: 'Budget Updated',
          description: 'Your budget has been successfully updated.',
        });
      } else {
        const budgetCollection = collection(firestore, 'users', targetUid, 'budgets');
        addDocumentNonBlocking(budgetCollection, budgetData);
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
    <ResponsiveModal
      open={open}
      onOpenChange={setOpen}
      trigger={children}
      title={isEditMode ? 'Edit Budget' : 'Create Budget'}
      description={isEditMode ? 'Change the settings for this budget.' : 'Set a spending limit for a specific category.'}
      className="sm:max-w-md"
    >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="space-y-4">
                <div className="space-y-4">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Category</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Monthly Resource Cap" {...field} className="h-12 rounded-xl bg-muted/30 border-border/40 focus:bg-background" />
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
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Budget Limit ({currency.toUpperCase()})</FormLabel>
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
                        name="period"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Time Period</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-border/40">
                                    <SelectValue placeholder="Horizon" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent className="glass-card shadow-premium border-border/40">
                                <SelectItem value="daily" className="font-bold text-xs">Daily</SelectItem>
                                <SelectItem value="weekly" className="font-bold text-xs">Weekly</SelectItem>
                                <SelectItem value="monthly" className="font-bold text-xs">Monthly</SelectItem>
                                <SelectItem value="yearly" className="font-bold text-xs">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
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
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Resource Classification</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-border/40">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent className="glass-card shadow-premium border-border/40">
                                {budgetCategories.map((category) => (
                                    <SelectItem key={category} value={category} className="font-bold text-xs">
                                    {category}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        <FormDescription className="text-[10px] leading-tight text-muted-foreground/60">
                            Selecting 'Overall' aggregates all expenditures for the chosen horizon.
                        </FormDescription>
                        <FormMessage />
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
                    {form.formState.isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Budget')}
                </Button>
            </div>
          </form>
        </Form>
    </ResponsiveModal>
  );
}
