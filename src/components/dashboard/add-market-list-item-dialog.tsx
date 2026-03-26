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
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import type { ShoppingList, ShoppingListItem } from '@/lib/types';


const shoppingListItemSchema = z.object({
  itemId: z.string().optional(), // Added to preserve ID during edit
  itemName: z.string().min(1, 'Item name cannot be empty.'),
  quantity: z.string().min(1, 'Quantity cannot be empty.'),
  estimatedPrice: z.coerce.number().min(0, 'Price cannot be negative.'),
});

const shoppingListSchema = z.object({
    heading: z.string().min(1, 'Please enter a heading for your list.'),
    items: z.array(shoppingListItemSchema).min(1, 'Please add at least one item.'),
});


interface AddShoppingListDialogProps {
  currency: string;
  children?: React.ReactNode;
  list?: ShoppingList;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddMarketListItemDialog({ currency, children, list, open: controlledOpen, onOpenChange: setControlledOpen }: AddShoppingListDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;
  
  const isEditMode = !!list;

  const form = useForm<z.infer<typeof shoppingListSchema>>({
    resolver: zodResolver(shoppingListSchema),
    defaultValues: {
      heading: '',
      items: [{ itemName: '', quantity: '', estimatedPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  useEffect(() => {
    if (open) {
        if (isEditMode && list) {
            form.reset({
                heading: list.heading,
                // Preserve itemId, but remove status as it's not directly editable in this form
                items: list.items.map(({ status, ...rest }) => rest), 
            });
        } else {
            form.reset({
                heading: '',
                items: [{ itemName: '', quantity: '', estimatedPrice: 0 }],
            });
        }
    }
  }, [open, list, isEditMode, form]);

  const onSubmit = async (values: z.infer<typeof shoppingListSchema>) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be signed in to manage lists.' });
      return;
    }

    try {
        if (isEditMode && list) {
            // Editing existing list
            const listRef = doc(firestore, 'users', user.uid, 'shoppingLists', list.id);
            const updatedItems = values.items.map(formItem => {
                const originalItem = list.items.find(original => original.itemId === formItem.itemId);
                return {
                    ...formItem,
                    itemId: formItem.itemId || crypto.randomUUID(), // Assign new ID if it's a new item
                    status: originalItem ? originalItem.status : 'pending', // Preserve status or default to pending
                };
            });
             setDocumentNonBlocking(listRef, {
                 heading: values.heading,
                 items: updatedItems
             }, { merge: true });

            toast({ title: `List Updated`, description: `Your list "${values.heading}" has been updated.` });

        } else {
            // Creating new list
            const listCollection = collection(firestore, 'users', user.uid, 'shoppingLists');
            const itemsWithIds: ShoppingListItem[] = values.items.map(item => ({
                itemName: item.itemName,
                quantity: item.quantity,
                estimatedPrice: item.estimatedPrice,
                itemId: crypto.randomUUID(),
                status: 'pending'
            }));

            const newListData = {
                userId: user.uid,
                heading: values.heading,
                items: itemsWithIds,
                createdAt: serverTimestamp(),
            };
            addDocumentNonBlocking(listCollection, newListData);
            
            toast({ title: `Shopping List Created`, description: `Your list "${values.heading}" has been saved.` });
        }

      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error saving market list:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the list. Please try again.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Create'} Shopping List</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Edit the name and items for your list.' : 'Give your list a name and add items to it.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[60vh] pr-6">
                <div className="space-y-4">
                     <FormField
                        control={form.control}
                        name="heading"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>List Heading</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Weekly Groceries, Trip to Makola" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    
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
                {form.formState.isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save List')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
