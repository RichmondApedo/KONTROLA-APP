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
import { useFirestore, useUser, useUserProfile } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import type { SavingsGoal } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Target, DollarSign } from 'lucide-react';

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
  const { activeProfileId } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const targetUid = activeProfileId || user?.uid;
  
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
    if (!user || !firestore || !targetUid) {
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
            userId: targetUid,
            currency: currency,
            currentAmount: goal?.currentAmount || 0,
        };

      if (isEditMode && goal.id) {
         const goalRef = doc(firestore, 'users', targetUid, 'savingsGoals', goal.id);
         setDocumentNonBlocking(goalRef, goalData, { merge: true });
         toast({
            title: 'Goal Updated',
            description: 'Your strategic objective has been adjusted.',
         });
      } else {
        const goalCollection = collection(firestore, 'users', targetUid, 'savingsGoals');
        addDocumentNonBlocking(goalCollection, goalData);
        toast({
            title: 'Goal Established',
            description: 'A new financial milestone has been recorded.',
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
    <ResponsiveModal
      open={open}
      onOpenChange={setOpen}
      trigger={children}
      title={isEditMode ? 'Edit Goal' : 'Set Goal'}
      description={isEditMode ? 'Change the details of your savings goal.' : 'Make a new goal to track your savings.'}
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
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Goal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Retirement Fund, Asset Acquisition" {...field} className="h-12 rounded-xl bg-muted/30 border-border/40 focus:bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Target Amount ({currency.toUpperCase()})</FormLabel>
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
              </div>
             </div>
             <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-12 rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 rounded-xl font-black bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
                    {form.formState.isSubmitting ? 'Saving...' : (isEditMode ? 'Save Goal' : 'Create Goal')}
                </Button>
            </div>
          </form>
        </Form>
    </ResponsiveModal>
  );
}
