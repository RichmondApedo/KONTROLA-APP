'use client';

import { useMemo, useState } from 'react';
import {
  useCollection,
  useFirestore,
  useUser,
} from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import type { MarketListItem } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';
import { Check, Trash2, ShoppingCart } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '../ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

function ApprovePurchaseButton({ item, currency }: { item: MarketListItem, currency: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = () => {
    if (!user || !firestore) return;
    setIsLoading(true);

    const expenseData = {
        amount: item.estimatedPrice,
        category: 'Food', // Defaulting to 'Food' as it's a market list
        currency: currency,
        date: new Date(),
        description: `Market Purchase: ${item.itemName}`,
        userId: user.uid,
        context: 'personal'
    };

    // 1. Add to expenses
    addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'expenses'), expenseData);
    
    // 2. Update item status
    const itemRef = doc(firestore, 'users', user.uid, 'marketList', item.id);
    updateDocumentNonBlocking(itemRef, { status: 'purchased' });

    toast({ title: 'Item Approved', description: `${item.itemName} has been added to your expenses.` });
    setIsLoading(false);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          <Check className="mr-2 h-4 w-4" /> Approve
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve this Purchase?</AlertDialogTitle>
          <AlertDialogDescription>
            This will add an expense of {formatCurrency(item.estimatedPrice, currency)} for "{item.itemName}" to your records and mark this item as purchased.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleApprove}>
            Approve
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


function DeleteItemButton({ itemId }: { itemId: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
  
    const handleDelete = () => {
      if (!user || !firestore) return;
      const itemRef = doc(firestore, 'users', user.uid, 'marketList', itemId);
      deleteDocumentNonBlocking(itemRef);
      toast({ title: 'Item Removed', description: 'The item has been removed from your list.' });
    };
  
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently remove this item from your market list.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    );
}

export function MarketList({ currency }: { currency: string }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const marketListQuery = useMemo(
    () =>
      user && firestore
        ? query(collection(firestore, 'users', user.uid, 'marketList'), orderBy('createdAt', 'desc'))
        : null,
    [user, firestore]
  );

  const { data: items, isLoading } = useCollection<MarketListItem>(marketListQuery);

  const { pendingItems, purchasedItems } = useMemo(() => {
    const pending: MarketListItem[] = [];
    const purchased: MarketListItem[] = [];
    if (items) {
      for (const item of items) {
        if (item.status === 'pending') {
          pending.push(item);
        } else {
          purchased.push(item);
        }
      }
    }
    return { pendingItems: pending, purchasedItems: purchased };
  }, [items]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {pendingItems && pendingItems.length > 0 ? (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Est. Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {pendingItems.map(item => (
                <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.estimatedPrice, currency)}</TableCell>
                    <TableCell className="text-right space-x-2">
                        <ApprovePurchaseButton item={item} currency={currency} />
                        <DeleteItemButton itemId={item.id} />
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        ) : (
            <div className="text-center text-muted-foreground py-8">
                <ShoppingCart className="mx-auto h-12 w-12" />
                <h3 className="mt-4 text-lg font-semibold">Your list is empty!</h3>
                <p>Add items to start planning your shopping.</p>
            </div>
      )}

      {purchasedItems && purchasedItems.length > 0 && (
         <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="purchased-items">
                <AccordionTrigger>View Recently Purchased Items ({purchasedItems.length})</AccordionTrigger>
                <AccordionContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchasedItems.map(item => (
                            <TableRow key={item.id} className="text-muted-foreground">
                                <TableCell className="font-medium line-through">{item.itemName}</TableCell>
                                <TableCell className="text-right line-through">{formatCurrency(item.estimatedPrice, currency)}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary">Purchased</Badge>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
