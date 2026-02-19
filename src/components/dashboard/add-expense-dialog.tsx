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
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { collection } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { ScrollArea } from '../ui/scroll-area';


const expenseSchema = z.object({
  description: z.string().min(1, 'Please enter a description.'),
  amount: z.coerce.number().positive('Please enter a positive amount.'),
  category: z.string().min(1, 'Please select a category.'),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Please enter a valid date.',
  }),
  context: z.enum(['personal', 'business']).default('personal'),
});

interface AddExpenseDialogProps {
  currency: string;
  plan?: 'free' | 'premium' | 'pro-plus';
}

const personalCategories = [
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

export function AddExpenseDialog({ currency, plan }: AddExpenseDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const isProPlus = plan === 'pro-plus' || user?.email === 'richmondapedo549@gmail.com';

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      amount: 0,
      category: '',
      date: new Date().toISOString().split('T')[0],
      context: 'personal',
    },
  });

  const context = form.watch('context');

  const onSubmit = (values: z.infer<typeof expenseSchema>) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be signed in to add an expense.',
      });
      return;
    }
    
    addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'expenses'), {
        ...values,
        userId: user.uid,
        currency: currency,
        date: new Date(values.date),
        context: isProPlus ? values.context : 'personal',
    });

    toast({
      title: 'Expense Added',
      description: 'The new expense has been saved.',
    });
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Add a new expense to your records.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4">
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
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                            <Textarea placeholder={context === 'business' ? "e.g., Office Supplies" : "e.g., Lunch with friends"} {...field} />
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
                            <Input type="number" placeholder="e.g., 85.50" {...field} />
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
                        {context === 'personal' ? (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {personalCategories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                    {category}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <FormControl>
                                <Input
                                placeholder="e.g., Marketing, Utilities"
                                {...field}
                                />
                            </FormControl>
                        )}
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
                </div>
            </ScrollArea>
            <DialogFooter className="mt-4 pt-4 border-t">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Expense'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
