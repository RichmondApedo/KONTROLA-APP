'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, getDoc } from 'firebase/firestore';
import type { Receipt, UserProfile, Customer, Invoice } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';
import { Trash2, Download, Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader } from '../ui/card';
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
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Input } from '../ui/input';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

function DeleteReceiptButton({ receiptId }: { receiptId: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!user || !firestore) return;
    const receiptRef = doc(firestore, 'users', user.uid, 'receipts', receiptId);
    deleteDocumentNonBlocking(receiptRef);
    toast({
      title: 'Receipt Deleted',
      description: 'The payment receipt has been removed.',
    });
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
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this receipt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DownloadReceiptButton({ receipt }: { receipt: Receipt }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile } = useDoc<UserProfile>(profileDocRef);

  const handleDownload = async () => {
    if (!profile || !user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Could not generate PDF.',
        description: 'User profile not found.',
      });
      return;
    }

    toast({ title: 'Generating Receipt PDF...' });

    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    // Fetch associated invoice and customer details
    let customer: Customer | null = null;
    let invoice: Invoice | null = null;
    try {
        const customerRef = doc(firestore, `users/${user.uid}/customers`, receipt.customerId);
        const fetches: Promise<any>[] = [getDoc(customerRef)];
        
        if (receipt.invoiceId) {
            const invoiceRef = doc(firestore, `users/${user.uid}/invoices`, receipt.invoiceId);
            fetches.push(getDoc(invoiceRef));
        }
        
        const [customerSnap, invoiceSnap] = await Promise.all(fetches);

        if (customerSnap.exists()) customer = customerSnap.data() as Customer;
        if (invoiceSnap && invoiceSnap.exists()) invoice = { id: invoiceSnap.id, ...invoiceSnap.data() } as Invoice;
        
    } catch(e) {
        console.error("Failed to fetch data for receipt PDF:", e);
        toast({ variant: 'destructive', title: 'Error fetching data', description: 'Could not fetch all required data for the receipt.' });
        return;
    }

    if (!customer) {
        toast({ variant: 'destructive', title: 'Data Missing', description: 'Could not find the customer for this receipt.' });
        return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const primaryColor = '#10B981'; 
    const secondaryColor = '#6B7280';

    // --- Header ---
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(primaryColor);
    pdf.text(profile.businessName || `${profile.firstName} ${profile.lastName}`, 14, 22);

    pdf.setFontSize(10);
    pdf.setTextColor(secondaryColor);
    pdf.setFont('helvetica', 'normal');
    if (profile.email) {
        pdf.text(profile.email, 14, 28);
    }

    // --- Receipt Info (Right Aligned) ---
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(40);
    pdf.text('PAYMENT RECEIPT', 200, 22, { align: 'right' });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(secondaryColor);
    let rightY = 30;
    pdf.text(`Receipt #: ${receipt.receiptNumber}`, 200, rightY, { align: 'right' });
    rightY += 5;
    const paymentDate = (receipt.paymentDate as any).toDate ? (receipt.paymentDate as any).toDate() : new Date(receipt.paymentDate);
    pdf.text(`Payment Date: ${format(paymentDate, 'PPP')}`, 200, rightY, { align: 'right' });

    // --- Paid To / From ---
    let leftY = 50;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(secondaryColor);
    pdf.text('PAYMENT FROM', 14, leftY);
    leftY += 6;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(40);
    pdf.text(customer.name, 14, leftY);
    leftY += 5;

    // --- Items Table ---
    const tableY = leftY + 10;
    (pdf as any).autoTable({
        startY: tableY,
        head: [['Description', 'Payment Method', 'Amount Paid']],
        body: [[
            receipt.invoiceId && invoice ? `Payment for Invoice #${invoice.invoiceNumber}` : (receipt.description || 'Payment Received'),
            receipt.paymentMethod,
            formatCurrency(receipt.amountPaid, receipt.currency),
        ]],
        theme: 'grid',
        headStyles: { fillColor: '#374151' },
        styles: { fontSize: 10, cellPadding: 2.5 },
    });

    let finalY = (pdf as any).lastAutoTable.finalY;

    // --- Total ---
    let totalY = finalY + 15;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(40);
    pdf.text('Total Paid:', 160, totalY, { align: 'right' });
    pdf.text(formatCurrency(receipt.amountPaid, receipt.currency), 200, totalY, { align: 'right' });

    // --- Footer ---
    const footerY = pdf.internal.pageSize.getHeight() - 15;
    pdf.setLineWidth(0.5);
    pdf.setDrawColor(primaryColor);
    pdf.line(14, footerY - 5, 200, footerY - 5);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(secondaryColor);
    pdf.text('Thank you for your payment!', 105, footerY, { align: 'center' });

    pdf.save(`Receipt-${receipt.receiptNumber}.pdf`);
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleDownload}>
      <Download className="h-4 w-4" />
      <span className="sr-only">Download Receipt</span>
    </Button>
  );
}

export function ReceiptList() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');

  const receiptsQuery = useMemo(
    () =>
      user && firestore
        ? query(
            collection(firestore, 'users', user.uid, 'receipts'),
            orderBy('paymentDate', 'desc')
          )
        : null,
    [user, firestore]
  );

  const { data: receipts, isLoading } = useCollection<Receipt>(receiptsQuery);

  const filteredReceipts = useMemo(() => {
    if (!receipts) return [];
    if (!searchQuery) return receipts;
    
    const lowercasedQuery = searchQuery.toLowerCase();
    
    return receipts.filter(receipt => 
      receipt.receiptNumber.toLowerCase().includes(lowercasedQuery) ||
      (receipt.invoiceId && receipt.invoiceId.toLowerCase().includes(lowercasedQuery))
    );
  }, [receipts, searchQuery]);

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
    <div className="space-y-4">
       <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
              placeholder="Search by receipt or invoice #"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
          />
      </div>
      
      {filteredReceipts && filteredReceipts.length > 0 ? (
        <>
          {/* Mobile View */}
          <div className="space-y-4 md:hidden">
            {filteredReceipts.map(receipt => (
              <Card key={receipt.id}>
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                  <div>
                    <p className="font-semibold">{receipt.receiptNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      Invoice: {receipt.invoiceId || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <DownloadReceiptButton receipt={receipt} />
                    <DeleteReceiptButton receiptId={receipt.id} />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="font-semibold text-lg text-primary">
                    {formatCurrency(receipt.amountPaid, receipt.currency)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Paid on:{' '}
                    {format(new Date((receipt.paymentDate as any).toDate ? (receipt.paymentDate as any).toDate() : receipt.paymentDate), 'PPP')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map(receipt => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{receipt.invoiceId || 'N/A'}</TableCell>
                    <TableCell>
                      {format(new Date((receipt.paymentDate as any).toDate ? (receipt.paymentDate as any).toDate() : receipt.paymentDate), 'PPP')}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(receipt.amountPaid, receipt.currency)}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <DownloadReceiptButton receipt={receipt} />
                      <DeleteReceiptButton receiptId={receipt.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
         <div className="text-center text-muted-foreground py-8">
          {receipts && receipts.length > 0 ? 'No receipts match your search.' : 'No receipts generated yet.'}
        </div>
      )}
    </div>
  );
}
