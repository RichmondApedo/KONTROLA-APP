'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, getDoc } from 'firebase/firestore';
import type { Receipt, UserProfile, Customer, Invoice } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';
import { Trash2, Download, Search, TrendingUp } from 'lucide-react';
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
    const primaryColor = '#10B981'; // Kontrola Emerald
    const accentColor = '#1F2937'; // Deep Charcoal
    const secondaryColor = '#6B7280'; // Muted Gray

    // --- Modern Header ---
    // Left Side: Business Branding
    const bizName = profile.businessName || `${profile.firstName} ${profile.lastName}`;
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(accentColor);
    pdf.text(bizName, 14, 25);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(secondaryColor);
    let leftY = 32;
    if (profile.email) {
        pdf.text(profile.email, 14, leftY);
        leftY += 5;
    }
    // Subtle accent line
    pdf.setDrawColor(primaryColor);
    pdf.setLineWidth(1);
    pdf.line(14, 27, 40, 27);

    // Right Side: Receipt Metadata
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(secondaryColor);
    pdf.text('RECEIPT NUMBER', 200, 20, { align: 'right' });
    pdf.setFontSize(14);
    pdf.setTextColor(accentColor);
    pdf.text(receipt.receiptNumber, 200, 26, { align: 'right' });

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(secondaryColor);
    pdf.text('PAYMENT DATE', 200, 35, { align: 'right' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(accentColor);
    const paymentDate = (receipt.paymentDate as any).toDate ? (receipt.paymentDate as any).toDate() : new Date(receipt.paymentDate);
    pdf.text(format(paymentDate, 'MMM dd, yyyy'), 200, 40, { align: 'right' });

    // --- Transaction Details ---
    let detailY = 60;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(secondaryColor);
    pdf.text('RECEIVED FROM', 14, detailY);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(accentColor);
    detailY += 7;
    pdf.text(customer.name, 14, detailY);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(secondaryColor);
    detailY += 5;
    if (customer.email) {
        pdf.text(customer.email, 14, detailY);
        detailY += 5;
    }

    // --- Success Badge (Top Right Corner) ---
    pdf.setFillColor(primaryColor);
    pdf.roundedRect(175, 48, 25, 8, 1, 1, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#FFFFFF');
    pdf.text('SUCCESS', 187.5, 53.5, { align: 'center' });

    // --- Items Table ---
    const tableY = detailY + 10;
    (pdf as any).autoTable({
        startY: tableY,
        head: [['Description', 'Payment Method', 'Amount Paid']],
        body: [[
            receipt.invoiceId && invoice ? `Payment for Invoice #${invoice.invoiceNumber}` : (receipt.description || 'General Payment'),
            receipt.paymentMethod,
            formatCurrency(receipt.amountPaid, receipt.currency),
        ]],
        theme: 'striped',
        headStyles: { 
            fillColor: accentColor, 
            textColor: '#FFFFFF', 
            fontSize: 10, 
            fontStyle: 'bold',
            halign: 'left'
        },
        columnStyles: {
            2: { halign: 'right' },
        },
        styles: { 
            fontSize: 9, 
            cellPadding: 6,
            lineColor: '#E5E7EB',
            lineWidth: 0.1
        },
        alternateRowStyles: {
            fillColor: '#F9FAFB'
        }
    });

    let finalY = (pdf as any).lastAutoTable.finalY + 15;

    // --- Total Section ---
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(primaryColor);
    pdf.text('TOTAL PAID:', 160, finalY, { align: 'right' });
    pdf.text(formatCurrency(receipt.amountPaid, receipt.currency), 200, finalY, { align: 'right' });

    // --- Footer ---
    const footerY = pdf.internal.pageSize.getHeight() - 25;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(accentColor);
    pdf.text('THANK YOU FOR YOUR PAYMENT', 105, footerY, { align: 'center' });
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(secondaryColor);
    pdf.text('This receipt is a verified proof of transaction.', 105, footerY + 5, { align: 'center' });
    
    pdf.setDrawColor(primaryColor);
    pdf.setLineWidth(0.5);
    pdf.line(85, footerY + 10, 125, footerY + 10);
    pdf.text('Generated by Kontrola Executive', 105, footerY + 15, { align: 'center' });

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
              <Card key={receipt.id} className="glass-card shadow-soft border-border/40 overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between p-5 pb-3">
                  <div className="space-y-0.5">
                    <p className="font-black tracking-tight text-lg leading-none">{receipt.receiptNumber}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                      INV: {receipt.invoiceId || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <DownloadReceiptButton receipt={receipt} />
                    <DeleteReceiptButton receiptId={receipt.id} />
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 flex justify-between items-end">
                  <div className="space-y-1">
                    <div className="text-2xl font-black tracking-tighter text-emerald-500">
                        {formatCurrency(receipt.amountPaid, receipt.currency)}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Paid on{' '}
                        {format(new Date((receipt.paymentDate as any).toDate ? (receipt.paymentDate as any).toDate() : receipt.paymentDate), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border/40">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-b border-border/40">
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest px-6 py-4">Receipt #</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest px-6 py-4">Invoice #</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest px-6 py-4">Payment Date</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest px-6 py-4">Amount Paid</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest px-6 py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map(receipt => (
                  <TableRow key={receipt.id} className="group transition-colors hover:bg-primary/5 duration-300 border-b border-border/40 last:border-0">
                    <TableCell className="font-bold text-sm tracking-tight px-6 py-4">{receipt.receiptNumber}</TableCell>
                    <TableCell className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 px-6 py-4">{receipt.invoiceId || 'N/A'}</TableCell>
                    <TableCell className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground px-6 py-4">
                      {format(new Date((receipt.paymentDate as any).toDate ? (receipt.paymentDate as any).toDate() : receipt.paymentDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-black text-lg tracking-tighter text-emerald-500 group-hover:scale-105 transition-transform origin-right px-6 py-4">
                      {formatCurrency(receipt.amountPaid, receipt.currency)}
                    </TableCell>
                    <TableCell className="text-right px-6 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DownloadReceiptButton receipt={receipt} />
                            <DeleteReceiptButton receiptId={receipt.id} />
                        </div>
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
