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
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from 'firebase/firestore';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

const marketListItemSchema = z.object({
  itemName: z.string().min(1, 'Item name cannot be empty.'),
  quantity: z.string().min(1, 'Quantity cannot be empty.'),
  estimatedPrice: z.coerce.number().min(0, 'Price cannot be negative.'),
});

const marketListSchema = z.object({
    items: z.array(marketListItemSchema).min(1, 'Please add at least one item.'),
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

  const form = useForm<z.infer<typeof marketListSchema>>({
    resolver: zodResolver(marketListSchema),
    defaultValues: {
      items: [{ itemName: '', quantity: '', estimatedPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  useEffect(() => {
    if (open) {
        form.reset({
            items: [{ itemName: '', quantity: '', estimatedPrice: 0 }],
        });
    }
  }, [open, form]);

  const onSubmit = async (values: z.infer<typeof marketListSchema>) => {
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
      let itemsAdded = 0;
      for (const item of values.items) {
          addDocumentNonBlocking(collectionRef, {
            ...item,
            userId: user.uid,
            status: 'pending',
            createdAt: serverTimestamp(),
          });
          itemsAdded++;
      }
      
      toast({
        title: `${itemsAdded} Item(s) Added`,
        description: `Your market list has been updated.`,
      });

      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error saving market list items:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save items. Please try again.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Items to Market List</DialogTitle>
          <DialogDescription>
            Build your shopping list. You can add multiple items at once.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[50vh] pr-6">
                <div className="space-y-4">
                    <FormLabel>Items</FormLabel>
                    <div className="space-y-3 mt-2">
                      {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-2 items-start border p-3 rounded-lg">
                          <FormField
                            control={form.control}
                            name={`items.${index}.itemName`}
                            render={({ field }) => (
                              <FormItem className="col-span-12 sm:col-span-5">
                                <FormLabel className="sr-only">Item Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Item Name (e.g., Tomatoes)" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem className="col-span-5 sm:col-span-3">
                                 <FormLabel className="sr-only">Quantity</FormLabel>
                                <FormControl>
                                  <Input placeholder="Quantity (e.g., 5)" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.estimatedPrice`}
                            render={({ field }) => (
                              <FormItem className="col-span-5 sm:col-span-3">
                                 <FormLabel className="sr-only">Est. Price</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder={`Price (${currency.toUpperCase()})`} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="col-span-2 sm:col-span-1"
                            disabled={fields.length <= 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ itemName: '', quantity: '', estimatedPrice: 0 })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Another Item
                      </Button>
                      <FormMessage>{form.formState.errors.items?.root?.message}</FormMessage>
                </div>
            </ScrollArea>
            <DialogFooter className="mt-6 pt-4 border-t pr-6">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save List'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
