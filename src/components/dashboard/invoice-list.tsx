'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, getDoc, increment } from 'firebase/firestore';
import type { Invoice, UserProfile, Customer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';
import { AddInvoiceDialog } from './add-invoice-dialog';
import { Pencil, Trash2, Download, Search, ChevronDown, Sparkles, FileDown, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
import { Badge } from '../ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Input } from '../ui/input';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

function DeleteInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!user || !firestore) return;
    const invoiceRef = doc(firestore, 'users', user.uid, 'invoices', invoiceId);
    deleteDocumentNonBlocking(invoiceRef);
    toast({
      title: 'Invoice Deleted',
      description: 'The invoice has been removed.',
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
            This action cannot be undone. This will permanently delete this
            invoice.
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

function DownloadInvoiceButton({ invoice }: { invoice: Invoice }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const profileDocRef = useMemo(
    () =>
      user && firestore
        ? doc(firestore, `users/${user.uid}/profile`, user.uid)
        : null,
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

    toast({ title: 'Generating Invoice PDF...' });

    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    // Fetch customer details
    let customer: Customer | null = null;
    try {
        const customerRef = doc(firestore, `users/${user.uid}/customers`, invoice.customerId);
        const customerSnap = await getDoc(customerRef);
        if (customerSnap.exists()) {
            customer = customerSnap.data() as Customer;
        }
    } catch(e) {
        console.error("Failed to fetch customer for invoice PDF:", e);
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
    // Added a subtle accent line under the company name
    pdf.setDrawColor(primaryColor);
    pdf.setLineWidth(1);
    pdf.line(14, 27, 40, 27);

    // Right Side: Invoice Metadata
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(secondaryColor);
    pdf.text('INVOICE NUMBER', 200, 20, { align: 'right' });
    pdf.setFontSize(14);
    pdf.setTextColor(accentColor);
    pdf.text(invoice.invoiceNumber, 200, 26, { align: 'right' });

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(secondaryColor);
    pdf.text('ISSUE DATE', 160, 35, { align: 'right' });
    pdf.text('DUE DATE', 200, 35, { align: 'right' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(accentColor);
    const issueDateStr = format((invoice.issueDate as any).toDate ? (invoice.issueDate as any).toDate() : new Date(invoice.issueDate), 'MMM dd, yyyy');
    const dueDateStr = format((invoice.dueDate as any).toDate ? (invoice.dueDate as any).toDate() : new Date(invoice.dueDate), 'MMM dd, yyyy');
    pdf.text(issueDateStr, 160, 40, { align: 'right' });
    pdf.text(dueDateStr, 200, 40, { align: 'right' });

    // --- Billing Details ---
    let detailY = 60;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(secondaryColor);
    pdf.text('BILL TO', 14, detailY);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(accentColor);
    detailY += 7;
    pdf.text(invoice.customerName, 14, detailY);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(secondaryColor);
    detailY += 5;
    if (customer) {
        if (customer.address) {
            const addressLines = pdf.splitTextToSize(customer.address, 70);
            pdf.text(addressLines, 14, detailY);
            detailY += (addressLines.length * 4.5);
        }
        if (customer.email) {
            pdf.text(customer.email, 14, detailY);
            detailY += 5;
        }
    }

    // --- Status Badge (Top Right Corner) ---
    const statusColors: Record<Invoice['status'], string> = {
        paid: primaryColor,
        overdue: '#EF4444',
        sent: '#3B82F6',
        draft: '#6B7280'
    };

    const badgeColor = statusColors[invoice.status] || secondaryColor;
    pdf.setFillColor(badgeColor);
    pdf.roundedRect(175, 48, 25, 8, 1, 1, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#FFFFFF');
    pdf.text(invoice.status.toUpperCase(), 187.5, 53.5, { align: 'center' });

    // --- Professional Items Table ---
    const tableY = detailY + 10;
    (pdf as any).autoTable({
        startY: tableY,
        head: [['Description', 'Qty', 'Unit Price', 'Total']],
        body: invoice.items.map(item => [
            item.description,
            item.quantity,
            formatCurrency(item.price, invoice.currency),
            formatCurrency(item.price * item.quantity, invoice.currency)
        ]),
        theme: 'striped',
        headStyles: { 
            fillColor: accentColor, 
            textColor: '#FFFFFF', 
            fontSize: 10, 
            fontStyle: 'bold',
            halign: 'left'
        },
        columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' },
        },
        styles: { 
            fontSize: 9, 
            cellPadding: 4,
            lineColor: '#E5E7EB',
            lineWidth: 0.1
        },
        alternateRowStyles: {
            fillColor: '#F9FAFB'
        }
    });

    let finalY = (pdf as any).lastAutoTable.finalY + 10;

    // --- Calculations / Totals ---
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(secondaryColor);
    pdf.text('Subtotal:', 160, finalY, { align: 'right' });
    pdf.setTextColor(accentColor);
    pdf.text(formatCurrency(invoice.totalAmount, invoice.currency), 200, finalY, { align: 'right' });
    
    pdf.setDrawColor('#E5E7EB');
    pdf.line(140, finalY + 4, 200, finalY + 4);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(primaryColor);
    pdf.text('TOTAL DUE:', 160, finalY + 12, { align: 'right' });
    pdf.text(formatCurrency(invoice.totalAmount, invoice.currency), 200, finalY + 12, { align: 'right' });

    // --- Modern Footer ---
    const footerY = pdf.internal.pageSize.getHeight() - 25;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(accentColor);
    pdf.text('THANK YOU FOR YOUR BUSINESS', 105, footerY, { align: 'center' });
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(secondaryColor);
    pdf.text('Please include the invoice number in your payment reference.', 105, footerY + 5, { align: 'center' });
    
    pdf.setDrawColor(primaryColor);
    pdf.setLineWidth(0.5);
    pdf.line(85, footerY + 10, 125, footerY + 10);
    pdf.text('Generated by Kontrola Executive', 105, footerY + 15, { align: 'center' });

    pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={handleDownload} className="h-9 w-9 rounded-xl hover:bg-primary/10 text-muted-foreground transition-all duration-300">
            <FileDown className="h-4 w-4" />
            <span className="sr-only">Download Invoice</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground border-none">
          Download {invoice.status} Invoice
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function InvoiceList() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const invoicesQuery = useMemo(
    () =>
      user && firestore
        ? query(
            collection(firestore, 'users', user.uid, 'invoices'),
            orderBy('issueDate', 'desc')
          )
        : null,
    [user, firestore]
  );

  const { data: invoices, isLoading } = useCollection<Invoice>(invoicesQuery);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    if (!searchQuery) return invoices;
    
    const lowercasedQuery = searchQuery.toLowerCase();
    
    return invoices.filter(invoice => 
      invoice.customerName.toLowerCase().includes(lowercasedQuery) ||
      invoice.invoiceNumber.toLowerCase().includes(lowercasedQuery)
    );
  }, [invoices, searchQuery]);

  const getStatusBadgeVariant = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'emerald';
      case 'sent':
        return 'indigo';
      case 'overdue':
        return 'destructive';
      case 'draft':
      default:
        return 'outline';
    }
  };

  const availableStatuses: Invoice['status'][] = ['draft', 'sent', 'paid', 'overdue'];

  const handleStatusChange = (invoice: Invoice, newStatus: Invoice['status']) => {
    if (!user || !firestore) return;
    const invoiceRef = doc(firestore, 'users', user.uid, 'invoices', invoice.id);
    updateDocumentNonBlocking(invoiceRef, { status: newStatus });
    toast({
      title: 'Invoice Status Updated',
      description: `Invoice #${invoice.invoiceNumber} marked as ${newStatus}.`,
    });

    if (newStatus === 'paid') {
        const customerRef = doc(firestore, 'users', user.uid, 'customers', invoice.customerId);
        updateDocumentNonBlocking(customerRef, {
            totalRevenue: increment(invoice.totalAmount),
            lastPurchaseDate: new Date(),
        });

      const receiptCollection = collection(firestore, 'users', user.uid, 'receipts');
      const receiptData = {
        userId: user.uid,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        receiptNumber: `RCPT-${Date.now().toString().slice(-6)}`,
        paymentDate: new Date(),
        amountPaid: invoice.totalAmount,
        currency: invoice.currency,
        paymentMethod: 'Invoice Payment',
        description: `Payment for Invoice #${invoice.invoiceNumber}`,
      };
      addDocumentNonBlocking(receiptCollection, receiptData);
      toast({
        title: 'Receipt Generated',
        description: `A receipt has been created for invoice #${invoice.invoiceNumber}.`,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
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
              placeholder="Search by customer name or invoice #"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
          />
      </div>

      {filteredInvoices && filteredInvoices.length > 0 ? (
        <>
          <div className="space-y-4 md:hidden">
            {filteredInvoices.map(invoice => (
              <Card 
                key={invoice.id} 
                className={cn(
                    "glass-card shadow-soft border-border/40 overflow-hidden group hover:border-primary/20 transition-all duration-500",
                    invoice.totalAmount > 5000 && "border-amber-500/20 shadow-[0_0_20px_-12px_rgba(245,158,11,0.3)] bg-gradient-to-br from-amber-500/[0.03] to-transparent"
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between p-5 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <p className="font-black tracking-tight text-lg leading-none">{invoice.customerName}</p>
                        {invoice.totalAmount > 5000 && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                                    </TooltipTrigger>
                                    <TooltipContent className="text-[10px] font-bold uppercase tracking-widest bg-amber-500 text-white border-none">
                                        High-Value Priority Asset
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                      INV: {invoice.invoiceNumber}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={cn(
                            "capitalize h-7 px-3 rounded-full text-[10px] font-black tracking-widest border-none transition-all duration-300",
                            invoice.status === 'paid' ? "bg-emerald-500/10 text-emerald-600 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]" :
                            invoice.status === 'sent' ? "bg-blue-500/10 text-blue-600" :
                            invoice.status === 'overdue' ? "bg-red-500/10 text-red-600 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]" :
                            "bg-muted/50 text-muted-foreground"
                        )}
                      >
                          {invoice.status}
                          <ChevronDown className="ml-1.5 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-card shadow-premium border-border/40">
                        {availableStatuses.map((status) => (
                            <DropdownMenuItem key={status} onClick={() => handleStatusChange(invoice, status)} disabled={invoice.status === status} className="capitalize font-bold text-xs">
                                Mark as {status}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                         <div className={cn(
                             "text-2xl font-black tracking-tighter",
                             invoice.totalAmount > 5000 ? "text-amber-600" : "text-primary"
                         )}>
                            {formatCurrency(invoice.totalAmount, invoice.currency)}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 leading-none">
                            {invoice.status === 'paid' ? (
                                <>
                                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                                    Settled In Full
                                </>
                            ) : (
                                <>
                                    <Clock className="h-3 w-3 text-muted-foreground/50" />
                                    Due {format(new Date((invoice.dueDate as any).toDate ? (invoice.dueDate as any).toDate() : invoice.dueDate), 'MMM d, yyyy')}
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <DownloadInvoiceButton invoice={invoice} />
                        <AddInvoiceDialog invoice={invoice} currency={invoice.currency}>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-muted-foreground transition-all duration-300">
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </AddInvoiceDialog>
                        <DeleteInvoiceButton invoiceId={invoice.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden md:block overflow-hidden rounded-xl border border-border/40">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-b border-border/40">
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest px-6 py-4">Customer</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest px-6 py-4">Number</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest px-6 py-4">Issue Date</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest px-6 py-4">Due Date</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest px-6 py-4">Status</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest px-6 py-4">Amount</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest px-6 py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map(invoice => (
                  <TableRow key={invoice.id} className="group transition-colors hover:bg-primary/5 duration-300 border-b border-border/40 last:border-0">
                    <TableCell className="font-bold text-sm tracking-tight px-6 py-4">
                      {invoice.customerName}
                    </TableCell>
                    <TableCell className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 px-6 py-4">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground px-6 py-4">
                      {format(
                        new Date(
                          (invoice.issueDate as any).toDate
                            ? (invoice.issueDate as any).toDate()
                            : invoice.issueDate
                        ),
                        'MMM d, yyyy'
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground px-6 py-4">
                      {format(
                        new Date(
                          (invoice.dueDate as any).toDate
                            ? (invoice.dueDate as any).toDate()
                            : invoice.dueDate
                        ),
                        'MMM d, yyyy'
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="w-[110px] justify-between capitalize h-8 rounded-lg text-[10px] font-bold tracking-widest border-border/40">
                                {invoice.status}
                                <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="glass-card shadow-premium border-border/40">
                            {availableStatuses.map((status) => (
                                <DropdownMenuItem key={status} onClick={() => handleStatusChange(invoice, status)} disabled={invoice.status === status} className="capitalize font-bold text-xs">
                                    {`Mark as ${status}`}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-right font-black text-lg tracking-tighter group-hover:scale-105 transition-transform origin-right px-6 py-4">
                      <span className={invoice.totalAmount > 5000 ? "text-amber-600" : "text-primary"}>
                        {formatCurrency(invoice.totalAmount, invoice.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right px-6 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DownloadInvoiceButton invoice={invoice} />
                            <AddInvoiceDialog
                                invoice={invoice}
                                currency={invoice.currency}
                            >
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-colors">
                                <Pencil className="h-4 w-4" />
                                </Button>
                            </AddInvoiceDialog>
                            <DeleteInvoiceButton invoiceId={invoice.id} />
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
          {invoices && invoices.length > 0 ? 'No invoices match your search.' : 'No invoices created yet. Get started by creating one!'}
        </div>
      )}
    </div>
  );
}
