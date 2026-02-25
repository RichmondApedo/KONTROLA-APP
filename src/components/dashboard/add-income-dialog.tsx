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
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const incomeSchema = z.object({
  name: z.string().min(1, 'Please enter a name for the income source.'),
  amount: z.coerce.number().positive('Please enter a positive amount.'),
  category: z.string().min(1, 'Please enter a category.'),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Please enter a valid date.',
  }),
  context: z.enum(['personal', 'business']).default('personal'),
});

interface AddIncomeDialogProps {
  currency: string;
  plan?: 'free' | 'premium' | 'pro-plus';
}

export function AddIncomeDialog({ currency, plan }: AddIncomeDialogProps) {
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
      date: new Date().toISOString().split('T')[0],
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
        date: new Date(values.date),
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Income
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Income</DialogTitle>
          <DialogDescription>
            Add a new source of income to your records.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isProPlus && (
                <FormField
                control={form.control}
                name="context"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Account Context</FormLabel>
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
                            <FormLabel className="font-normal">Personal</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="business" />
                            </FormControl>
                            <FormLabel className="font-normal">Business</FormLabel>
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
                  <FormLabel>Income Source Name</FormLabel>
                  <FormControl>
                    <Input placeholder={context === 'business' ? "e.g., Client Project Payment" : "e.g., Monthly Salary"} {...field} />
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
                    <Input type="number" placeholder="e.g., 5000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder={context === 'business' ? "e.g., Sales, Services" : "e.g., Salary, Investment"} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
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
                {form.formState.isSubmitting ? 'Saving...' : 'Save Income'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
