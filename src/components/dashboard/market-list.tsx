'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, orderBy, doc, limit } from 'firebase/firestore';
import type { ShoppingList, ShoppingListItem } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';
import { Check, Trash2, ShoppingCart, Share2, Download, Edit } from 'lucide-react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '../ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { AddMarketListItemDialog } from './add-market-list-item-dialog';
import { PlusCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import type jsPDF from 'jspdf';
import { useMediaQuery } from '@/hooks/use-media-query';

function ShoppingListCard({ list, currency }: { list: ShoppingList; currency: string }) {
  const { user } = useUser();
  const { activeProfileId } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();

  const targetUid = activeProfileId || user?.uid;
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const totalEstimatedPrice = useMemo(() => {
    return list.items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity);
      const validQuantity = isNaN(quantity) ? 1 : quantity;
      return sum + validQuantity * item.estimatedPrice;
    }, 0);
  }, [list.items]);
  
  const pendingItems = useMemo(() => list.items.filter((i) => i.status === 'pending'), [list.items]);
  const purchasedItems = useMemo(() => list.items.filter((i) => i.status === 'purchased'), [list.items]);

  const handleApproveItem = (itemId: string) => {
    if (!user || !firestore || !targetUid) return;

    const itemToApprove = list.items.find((i) => i.itemId === itemId);
    if (!itemToApprove) return;
    
    const quantity = parseFloat(itemToApprove.quantity);
    const validQuantity = isNaN(quantity) ? 1 : quantity;
    const totalAmount = validQuantity * itemToApprove.estimatedPrice;

    const expenseData = {
      amount: totalAmount,
      category: 'Food',
      currency: currency,
      date: new Date(),
      description: `Market Purchase: ${itemToApprove.itemName}`,
      userId: targetUid,
      context: 'personal',
    };
    addDocumentNonBlocking(collection(firestore, 'users', targetUid, 'expenses'), expenseData);

    const updatedItems = list.items.map((item) => (item.itemId === itemId ? { ...item, status: 'purchased' } : item));
    const listRef = doc(firestore, 'users', targetUid, 'shoppingLists', list.id);
    updateDocumentNonBlocking(listRef, { items: updatedItems });

    toast({ title: 'Item Approved', description: `${itemToApprove.itemName} has been added to your expenses.` });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!user || !firestore || !targetUid) return;
    const updatedItems = list.items.filter((item) => item.itemId !== itemId);
    const listRef = doc(firestore, 'users', targetUid, 'shoppingLists', list.id);
    updateDocumentNonBlocking(listRef, { items: updatedItems });
    toast({ title: 'Item Removed', description: 'The item has been removed from the list.' });
  };
  
  const handleDeleteList = () => {
    if (!user || !firestore || !targetUid) return;
    const listRef = doc(firestore, 'users', targetUid, 'shoppingLists', list.id);
    deleteDocumentNonBlocking(listRef);
    toast({ title: 'List Deleted', description: `The list "${list.heading}" has been deleted.` });
  };

  const handleShare = async () => {
    const listText = `My Shopping List: ${list.heading}\n\n` + list.items.map((item) => `- ${item.itemName} (${item.quantity})`).join('\n');
    if (navigator.share) {
        try {
            await navigator.share({ title: `Shopping List: ${list.heading}`, text: listText });
        } catch (error: any) {
            // Ignore AbortError if user cancels share dialog
            if (error.name !== 'AbortError') {
                console.error('Error sharing:', error);
                toast({ variant: 'destructive', title: "Couldn't share", description: 'Something went wrong.' });
            }
        }
    } else {
        try {
            await navigator.clipboard.writeText(listText);
            toast({ title: 'Copied to clipboard', description: 'Your shopping list has been copied.' });
        } catch (err) {
             toast({ variant: 'destructive', title: "Couldn't copy", description: 'Failed to copy list to clipboard.' });
        }
    }
  };

  const handleDownload = async () => {
    toast({ title: "Generating PDF..." });
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    doc.text(`Shopping List: ${list.heading}`, 14, 15);
    (doc as any).autoTable({
      startY: 20,
      head: [['Item', 'Quantity', 'Est. Price']],
      body: list.items.map(item => [item.itemName, item.quantity, formatCurrency(item.estimatedPrice, currency)]),
    });
    doc.save(`${list.heading.replace(/\s+/g, '_')}_list.pdf`);
  };
  
  const getSafeDate = (date: any): Date => {
      if (date instanceof Date) return date;
      if (date && typeof date.toDate === 'function') return date.toDate();
      if (typeof date === 'string' || typeof date === 'number') return new Date(date);
      return new Date(); // Fallback
  };


  return (
    <AccordionItem value={list.id}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex-1 text-left">
          <p className="font-semibold">{list.heading}</p>
          <p className="text-sm text-muted-foreground">
            {format(getSafeDate(list.createdAt), 'PPP')} - {list.items.length} items
          </p>
        </div>
        <span className="text-lg font-bold px-4">{formatCurrency(totalEstimatedPrice, currency)}</span>
      </AccordionTrigger>
      <AccordionContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
            <Button variant="outline" size="sm" onClick={handleDownload}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
            <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete List</Button></AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{list.heading}"?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete this shopping list.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteList} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
        
        {pendingItems.length > 0 && (
            <div>
                <h4 className="font-semibold mb-2">Pending Items</h4>
                 {isDesktop ? (
                    <Table>
                        <TableBody>
                            {pendingItems.map((item) => (
                                <TableRow key={item.itemId}>
                                    <TableCell>{item.itemName} <span className="text-muted-foreground">({item.quantity})</span></TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.estimatedPrice, currency)}</TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="outline" size="sm" onClick={() => handleApproveItem(item.itemId)}><Check className="mr-2 h-4 w-4" />Approve</Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.itemId)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="space-y-3">
                        {pendingItems.map((item) => (
                           <Card key={item.itemId} className="bg-muted/50">
                               <CardContent className="p-3 flex flex-col gap-2">
                                   <div className="flex justify-between items-start">
                                       <div>
                                           <p className="font-medium">{item.itemName}</p>
                                           <p className="text-sm text-muted-foreground">{item.quantity}</p>
                                       </div>
                                       <p className="font-semibold">{formatCurrency(item.estimatedPrice, currency)}</p>
                                   </div>
                                   <div className="flex justify-end gap-2 mt-2">
                                       <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => handleDeleteItem(item.itemId)}>
                                           <Trash2 className="mr-2 h-4 w-4" />
                                           Remove
                                       </Button>
                                       <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleApproveItem(item.itemId)}>
                                           <Check className="mr-2 h-4 w-4" />
                                           Approve
                                       </Button>
                                   </div>
                               </CardContent>
                           </Card>
                        ))}
                    </div>
                )}
            </div>
        )}

        {purchasedItems.length > 0 && (
             <div>
                <h4 className="font-semibold mb-2 mt-4">Purchased Items</h4>
                 {isDesktop ? (
                    <Table>
                        <TableBody>
                            {purchasedItems.map((item) => {
                                const quantity = parseFloat(item.quantity);
                                const validQuantity = isNaN(quantity) ? 1 : quantity;
                                return (
                                <TableRow key={item.itemId} className="text-muted-foreground">
                                    <TableCell className="line-through">{item.itemName} <span className="text-muted-foreground">({item.quantity})</span></TableCell>
                                    <TableCell className="text-right line-through">{formatCurrency(validQuantity * item.estimatedPrice, currency)}</TableCell>
                                    <TableCell className="text-right"><Badge variant="secondary">Purchased</Badge></TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="space-y-2">
                         {purchasedItems.map((item) => {
                            const quantity = parseFloat(item.quantity);
                            const validQuantity = isNaN(quantity) ? 1 : quantity;
                            return (
                            <div key={item.itemId} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                                <div>
                                    <p className="line-through text-muted-foreground">{item.itemName}</p>
                                    <p className="text-xs line-through text-muted-foreground">{item.quantity}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold line-through text-muted-foreground">{formatCurrency(validQuantity * item.estimatedPrice, currency)}</p>
                                    <Badge variant="secondary">Purchased</Badge>
                                </div>
                            </div>
                         )})}
                    </div>
                )}
            </div>
        )}
        
        <AddMarketListItemDialog currency={currency} list={list} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />

      </AccordionContent>
    </AccordionItem>
  );
}


export function MarketList({ currency }: { currency: string }) {
  const { user } = useUser();
  const { activeProfileId } = useUserProfile();
  const firestore = useFirestore();

  const targetUid = activeProfileId || user?.uid;
  const [pageSize, setPageSize] = useState(10);

  const shoppingListsQuery = useMemo(
    () => (targetUid && firestore ? query(collection(firestore, 'users', targetUid, 'shoppingLists'), orderBy('createdAt', 'desc'), limit(pageSize)) : null),
    [targetUid, firestore, pageSize]
  );
  const { data: lists, isLoading } = useCollection<ShoppingList>(shoppingListsQuery);

  return (
    <Card>
      <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>Your Shopping Lists</CardTitle>
          <CardDescription>Plan your shopping and approve purchases to track expenses.</CardDescription>
        </div>
        <AddMarketListItemDialog currency={currency}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New List
          </Button>
        </AddMarketListItemDialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : lists && lists.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {lists.map((list) => (
              <ShoppingListCard key={list.id} list={list} currency={currency} />
            ))}
            
            {lists && lists.length >= pageSize && (
                <div className="flex justify-center pt-8 pb-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPageSize(prev => prev + 10)}
                    className="rounded-xl font-bold uppercase tracking-widest text-[10px] border-primary/20 hover:bg-primary/5 h-11 px-8 group transition-all duration-300"
                  >
                    <Plus className="mr-2 h-3.5 w-3.5 opacity-50 group-hover:rotate-90 transition-transform duration-500" />
                    Load More Lists
                  </Button>
                </div>
            )}
          </Accordion>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <ShoppingCart className="mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">No shopping lists yet!</h3>
            <p>Click "Create New List" to start planning.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
