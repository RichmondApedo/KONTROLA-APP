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
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { PlusCircle, Trash2, ShoppingBag, Hash, Tag } from 'lucide-react';
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
    <ResponsiveModal
      open={open}
      onOpenChange={setOpen}
      trigger={children}
      title={isEditMode ? 'Edit Market List' : 'Create Market List'}
      description={isEditMode ? 'Change the items in your shopping list.' : 'Make a new shopping list for your groceries or supplies.'}
      className="sm:max-w-2xl"
    >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="space-y-4">
                <div className="space-y-4">
                     <FormField
                        control={form.control}
                        name="heading"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">List Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Q2 Operational Supplies" {...field} className="h-12 rounded-xl bg-muted/30 border-border/40 focus:bg-background" />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Line Items</FormLabel>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ itemName: '', quantity: '', estimatedPrice: 0 })}
                            className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 hover:bg-primary/10"
                        >
                            <PlusCircle className="mr-1.5 h-3 w-3" />
                            Add Item
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {fields.map((field, index) => (
                          <div key={field.id} className="relative grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-2xl border border-border/40 bg-muted/20 shadow-inner group/item">
                            <FormField
                              control={form.control}
                              name={`items.${index}.itemName`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-5">
                                  <FormLabel className="text-[10px] font-black uppercase tracking-tight text-muted-foreground/60 mb-1 flex items-center gap-1.5">
                                      <ShoppingBag className="h-3 w-3" /> Item Name
                                  </FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Unit A1" {...field} className="h-10 rounded-lg bg-background/50" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-3">
                                   <FormLabel className="text-[10px] font-black uppercase tracking-tight text-muted-foreground/60 mb-1 flex items-center gap-1.5">
                                      <Hash className="h-3 w-3" /> Quantity
                                  </FormLabel>
                                  <FormControl>
                                    <Input placeholder="Qty" {...field} className="h-10 rounded-lg bg-background/50" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.estimatedPrice`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-3">
                                   <FormLabel className="text-[10px] font-black uppercase tracking-tight text-muted-foreground/60 mb-1 flex items-center gap-1.5">
                                      <Tag className="h-3 w-3" /> Price
                                  </FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.01" placeholder="0.00" {...field} className="h-10 rounded-lg bg-background/50" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex items-end justify-end md:col-span-1 pb-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => remove(index)}
                                    className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                                    disabled={fields.length <= 1}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <FormMessage>{form.formState.errors.items?.root?.message}</FormMessage>
                    </div>
                </div>
              </div>
             </div>
             <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-12 rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 rounded-xl font-black bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
                    {form.formState.isSubmitting ? 'Saving...' : (isEditMode ? 'Save List' : 'Create List')}
                </Button>
            </div>
          </form>
        </Form>
    </ResponsiveModal>
  );
}
