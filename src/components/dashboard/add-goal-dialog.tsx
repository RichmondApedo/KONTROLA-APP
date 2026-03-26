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
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import type { SavingsGoal } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';

const goalSchema = z.object({
  name: z.string().min(1, 'Please enter a name for your goal.'),
  targetAmount: z.coerce.number().positive('Please enter a positive amount.'),
});

interface AddGoalDialogProps {
  children?: React.ReactNode;
  goal?: SavingsGoal | null;
  currency: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  suggestion?: {
      name: string;
      targetAmount: number;
  };
}

export function AddGoalDialog({ children, goal, currency, open: controlledOpen, onOpenChange: setControlledOpen, suggestion }: AddGoalDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;
  
  const isEditMode = !!goal;

  const form = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      targetAmount: 0,
    },
  });

  useEffect(() => {
    if (open) {
        if (suggestion) {
            form.reset({
                name: suggestion.name,
                targetAmount: suggestion.targetAmount,
            });
        } else if (goal) {
          form.reset({
            name: goal.name,
            targetAmount: goal.targetAmount,
          });
        } else {
           form.reset({
            name: '',
            targetAmount: 0,
          });
        }
    }
  }, [goal, form, open, suggestion]);

  const onSubmit = async (values: z.infer<typeof goalSchema>) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be signed in to set a goal.',
      });
      return;
    }

    try {
        const goalData = {
            ...values,
            userId: user.uid,
            currency: currency,
            currentAmount: goal?.currentAmount || 0,
        };

      if (isEditMode && goal.id) {
         const goalRef = doc(firestore, 'users', user.uid, 'savingsGoals', goal.id);
         setDocumentNonBlocking(goalRef, goalData, { merge: true });
         toast({
            title: 'Savings Goal Updated',
            description: 'Your goal has been updated.',
         });
      } else {
        const goalCollection = collection(firestore, 'users', user.uid, 'savingsGoals');
        addDocumentNonBlocking(goalCollection, goalData);
        toast({
            title: 'Savings Goal Added',
            description: 'Your new goal has been set.',
        });
      }
      
      setOpen(false);
    } catch (error) {
      console.error('Error setting savings goal:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save your goal. Please try again.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit' : 'Set'} Your Savings Goal</DialogTitle>
          <DialogDescription>
            Define your target and track your progress.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 pt-1">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., New Car Fund" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetAmount"
                  render={({ field }) => (
                    <FormItem className="pb-2">
                      <FormLabel>Target Amount ({currency.toUpperCase()})</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 20000" {...field} />
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
                {form.formState.isSubmitting ? 'Saving...' : 'Save Goal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
