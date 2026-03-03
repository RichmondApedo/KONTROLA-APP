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
import { Check, Trash2, ShoppingCart, Share2, Download, ChevronDown, PlusCircle } from 'lucide-react';
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { AddMarketListItemDialog } from './add-market-list-item-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type jsPDF from 'jspdf';


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
  const { toast } = useToast();

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

  const handleShare = async () => {
    if (!pendingItems || pendingItems.length === 0) {
        toast({ title: "List is empty", description: "Add items to your list before sharing." });
        return;
    }

    const listText = "My Market List:\n" + pendingItems.map(item =>
        `- ${item.itemName} (${item.quantity}) - est. ${formatCurrency(item.estimatedPrice, currency)}`
    ).join('\n');

    const shareData = {
        title: 'My Market List',
        text: listText,
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(listText);
            toast({ title: "Copied to clipboard!", description: "Your market list has been copied." });
        }
    } catch (error) {
        console.error('Error sharing:', error);
        toast({ variant: 'destructive', title: "Couldn't share list", description: 'Something went wrong.' });
    }
  };

  const handleDownloadPDF = async () => {
    if (!pendingItems || pendingItems.length === 0) {
      toast({ title: "List is empty", description: "Add items to your list before downloading." });
      return;
    }
    toast({ title: "Generating PDF..." });
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    doc.text("Market Shopping List", 14, 15);
    (doc as any).autoTable({
      startY: 20,
      head: [['Item', 'Quantity', 'Estimated Price']],
      body: pendingItems.map(item => [
        item.itemName,
        item.quantity,
        formatCurrency(item.estimatedPrice, currency)
      ]),
    });
    doc.save('market-list.pdf');
  };

  const handleDownloadTXT = () => {
    if (!pendingItems || pendingItems.length === 0) {
      toast({ title: "List is empty", description: "Add items to your list before downloading." });
      return;
    }
    const listText = "Market Shopping List\n\n" + pendingItems.map(item =>
        `${item.itemName} | Quantity: ${item.quantity} | Est. Price: ${formatCurrency(item.estimatedPrice, currency)}`
    ).join('\n');

    const blob = new Blob([listText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'market-list.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
        <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Your Market Shopping List</CardTitle>
                <CardDescription>
                    Plan your shopping and add purchased items to your expenses.
                </CardDescription>
            </div>
            <div className="flex w-full sm:w-auto flex-col-reverse sm:flex-row gap-2">
                <AddMarketListItemDialog currency={currency}>
                    <Button className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </AddMarketListItemDialog>
                <Button variant="outline" className="w-full sm:w-auto" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                        <Download className="mr-2 h-4 w-4" />
                        <span>Download</span>
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleDownloadPDF}>Download as PDF</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadTXT}>Download as TXT</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : pendingItems && pendingItems.length > 0 ? (
                <>
                    {/* Mobile View */}
                    <div className="space-y-4 md:hidden">
                        {pendingItems.map(item => (
                            <div key={item.id} className="flex items-center gap-4 rounded-lg border p-3">
                                <div className="flex-1">
                                    <p className="font-medium">{item.itemName}</p>
                                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                    <p className="text-sm font-semibold">{formatCurrency(item.estimatedPrice, currency)}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <ApprovePurchaseButton item={item} currency={currency} />
                                    <DeleteItemButton itemId={item.id} />
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Desktop View */}
                    <div className="hidden md:block">
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
                    </div>
                </>
            ) : (
                <div className="text-center text-muted-foreground py-8">
                    <ShoppingCart className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">Your list is empty!</h3>
                    <p>Add items to start planning your shopping.</p>
                </div>
            )}

            {purchasedItems && purchasedItems.length > 0 && (
                <Accordion type="single" collapsible className="w-full mt-6">
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
        </CardContent>
    </Card>
  );
}
