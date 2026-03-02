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
import { useState } from 'react';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from 'firebase/firestore';

const marketListItemSchema = z.object({
  itemName: z.string().min(1, 'Please enter an item name.'),
  quantity: z.string().min(1, 'Please enter a quantity.'),
  estimatedPrice: z.coerce.number().positive('Please enter an estimated price.'),
});

interface AddMarketListItemDialogProps {
  currency: string;
  children: React.ReactNode;
}

export function AddMarketListItemDialog({ currency, children }: AddMarketListItemDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof marketListItemSchema>>({
    resolver: zodResolver(marketListItemSchema),
    defaultValues: {
      itemName: '',
      quantity: '',
      estimatedPrice: 0,
    },
  });

  const onSubmit = async (values: z.infer<typeof marketListItemSchema>) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be signed in to manage a market list.',
      });
      return;
    }

    try {
      const collectionRef = collection(firestore, 'users', user.uid, 'marketList');
      addDocumentNonBlocking(collectionRef, {
        ...values,
        userId: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Item Added',
        description: `${values.itemName} has been added to your market list.`,
      });

      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error saving market list item:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save item. Please try again.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Item to Market List</DialogTitle>
          <DialogDescription>
            Add a new item to your shopping list.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="itemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Tomatoes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estimatedPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Price ({currency.toUpperCase()})</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 10.50" {...field} />
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
                {form.formState.isSubmitting ? 'Saving...' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
