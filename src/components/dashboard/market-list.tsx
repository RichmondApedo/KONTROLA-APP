'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import type { ShoppingList, ShoppingListItem } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';
import { Check, Trash2, ShoppingCart, Share2, Download, Edit } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '../ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { AddMarketListItemDialog } from './add-market-list-item-dialog';
import { PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import type jsPDF from 'jspdf';

function ShoppingListCard({ list, currency }: { list: ShoppingList; currency: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const totalEstimatedPrice = useMemo(() => list.items.reduce((sum, item) => sum + item.estimatedPrice, 0), [list.items]);
  const pendingItems = useMemo(() => list.items.filter((i) => i.status === 'pending'), [list.items]);
  const purchasedItems = useMemo(() => list.items.filter((i) => i.status === 'purchased'), [list.items]);

  const handleApproveItem = (itemId: string) => {
    if (!user || !firestore) return;

    const itemToApprove = list.items.find((i) => i.itemId === itemId);
    if (!itemToApprove) return;

    const expenseData = {
      amount: itemToApprove.estimatedPrice,
      category: 'Food',
      currency: currency,
      date: new Date(),
      description: `Market Purchase: ${itemToApprove.itemName}`,
      userId: user.uid,
      context: 'personal',
    };
    addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'expenses'), expenseData);

    const updatedItems = list.items.map((item) => (item.itemId === itemId ? { ...item, status: 'purchased' } : item));
    const listRef = doc(firestore, 'users', user.uid, 'shoppingLists', list.id);
    updateDocumentNonBlocking(listRef, { items: updatedItems });

    toast({ title: 'Item Approved', description: `${itemToApprove.itemName} has been added to your expenses.` });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!user || !firestore) return;
    const updatedItems = list.items.filter((item) => item.itemId !== itemId);
    const listRef = doc(firestore, 'users', user.uid, 'shoppingLists', list.id);
    updateDocumentNonBlocking(listRef, { items: updatedItems });
    toast({ title: 'Item Removed', description: 'The item has been removed from the list.' });
  };
  
  const handleDeleteList = () => {
    if (!user || !firestore) return;
    const listRef = doc(firestore, 'users', user.uid, 'shoppingLists', list.id);
    deleteDocumentNonBlocking(listRef);
    toast({ title: 'List Deleted', description: `The list "${list.heading}" has been deleted.` });
  };

  const handleShare = async () => {
    const listText = `My Shopping List: ${list.heading}\n\n` + list.items.map((item) => `- ${item.itemName} (${item.quantity})`).join('\n');
    try {
      await navigator.share({ title: `Shopping List: ${list.heading}`, text: listText });
    } catch (err) {
      await navigator.clipboard.writeText(listText);
      toast({ title: 'Copied to clipboard', description: 'Your shopping list has been copied.' });
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

  return (
    <AccordionItem value={list.id}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex-1 text-left">
          <p className="font-semibold">{list.heading}</p>
          <p className="text-sm text-muted-foreground">
            {format(list.createdAt instanceof Date ? list.createdAt : (list.createdAt as any).toDate(), 'PPP')} - {list.items.length} items
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
                <Table>
                    <TableBody>
                        {pendingItems.map((item) => (
                            <TableRow key={item.itemId}>
                                <TableCell>{item.itemName} <span className="text-muted-foreground">({item.quantity})</span></TableCell>
                                <TableCell className="text-right">{formatCurrency(item.estimatedPrice, currency)}</TableCell>
                                <TableCell className="text-right space-x-1">
                                    <Button variant="outline" size="sm" onClick={() => handleApproveItem(item.itemId)}><Check className="mr-2 h-4 w-4" />Approve</Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.itemId)}><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )}

        {purchasedItems.length > 0 && (
             <div>
                <h4 className="font-semibold mb-2 mt-4">Purchased Items</h4>
                <Table>
                    <TableBody>
                        {purchasedItems.map((item) => (
                            <TableRow key={item.itemId} className="text-muted-foreground">
                                <TableCell className="line-through">{item.itemName}</TableCell>
                                <TableCell className="text-right line-through">{formatCurrency(item.estimatedPrice, currency)}</TableCell>
                                <TableCell className="text-right"><Badge variant="secondary">Purchased</Badge></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )}
        
        <AddMarketListItemDialog currency={currency} list={list} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />

      </AccordionContent>
    </AccordionItem>
  );
}


export function MarketList({ currency }: { currency: string }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const shoppingListsQuery = useMemo(
    () => (user && firestore ? query(collection(firestore, 'users', user.uid, 'shoppingLists'), orderBy('createdAt', 'desc')) : null),
    [user, firestore]
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
