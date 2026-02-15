'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, getDoc } from 'firebase/firestore';
import type { Invoice, UserProfile, Customer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';
import { AddInvoiceDialog } from './add-invoice-dialog';
import { Pencil, Trash2, Download, Search, ChevronDown } from 'lucide-react';
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
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
import { formatCurrency } from '@/lib/utils';
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
    const primaryColor = '#10B981'; // A professional green
    const secondaryColor = '#6B7280'; // A neutral gray

    // --- Header ---
    if (profile.businessName) {
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(primaryColor);
        pdf.text(profile.businessName, 14, 22);
    } else {
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(primaryColor);
        pdf.text(`${profile.firstName} ${profile.lastName}`, 14, 22);
    }

    pdf.setFontSize(10);
    pdf.setTextColor(secondaryColor);
    pdf.setFont('helvetica', 'normal');
    if (profile.email) {
        pdf.text(profile.email, 14, 28);
    }

    // --- Invoice Info (Right Aligned) ---
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(40);
    pdf.text('INVOICE', 200, 22, { align: 'right' });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(secondaryColor);
    let rightY = 30;
    pdf.text(`Invoice #: ${invoice.invoiceNumber}`, 200, rightY, { align: 'right' });
    rightY += 5;
    const issueDate = (invoice.issueDate as any).toDate ? (invoice.issueDate as any).toDate() : new Date(invoice.issueDate);
    pdf.text(`Issue Date: ${format(issueDate, 'PPP')}`, 200, rightY, { align: 'right' });
    rightY += 5;
    const dueDate = (invoice.dueDate as any).toDate ? (invoice.dueDate as any).toDate() : new Date(invoice.dueDate);
    pdf.text(`Due Date: ${format(dueDate, 'PPP')}`, 200, rightY, { align: 'right' });

    // --- Bill To ---
    let leftY = 50;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(secondaryColor);
    pdf.text('BILL TO', 14, leftY);
    leftY += 6;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(40);
    pdf.text(invoice.customerName, 14, leftY);
    leftY += 5;

    if (customer) {
        if (customer.address) {
            const addressLines = pdf.splitTextToSize(customer.address, 80);
            pdf.text(addressLines, 14, leftY);
            leftY += (addressLines.length * 4); // smaller line height
        }
        if (customer.email) {
            pdf.text(customer.email, 14, leftY);
            leftY += 5;
        }
        if (customer.phone) {
            pdf.text(customer.phone, 14, leftY);
        }
    }
    const tableY = leftY + 10;

    // --- Items Table ---
    (pdf as any).autoTable({
        startY: tableY,
        head: [['Description', 'Qty', 'Unit Price', 'Total']],
        body: [
          [
            invoice.description,
            '1',
            formatCurrency(invoice.amount, invoice.currency),
            formatCurrency(invoice.amount, invoice.currency),
          ],
        ],
        theme: 'grid',
        headStyles: { fillColor: '#374151' }, // Dark gray header
        styles: { fontSize: 10, cellPadding: 2.5 },
    });

    let finalY = (pdf as any).lastAutoTable.finalY;

    // --- Total ---
    let totalY = finalY + 15;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(40);
    pdf.text('Total:', 160, totalY, { align: 'right' });
    pdf.text(formatCurrency(invoice.amount, invoice.currency), 200, totalY, { align: 'right' });

    // --- Status Stamp ---
    if (invoice.status === 'paid' || invoice.status === 'overdue') {
        pdf.setFontSize(50);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(invoice.status === 'paid' ? '#10B981' : '#EF4444');
        pdf.saveGraphicsState();
        pdf.setGState(new (pdf as any).GState({ opacity: 0.1 }));
        pdf.text(invoice.status.toUpperCase(), 105, pdf.internal.pageSize.getHeight() / 2 + 10, { align: 'center', angle: -45 });
        pdf.restoreGraphicsState();
    }

    // --- Footer ---
    const footerY = pdf.internal.pageSize.getHeight() - 15;
    pdf.setLineWidth(0.5);
    pdf.setDrawColor(primaryColor);
    pdf.line(14, footerY - 5, 200, footerY - 5);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(secondaryColor);
    pdf.text('Thank you for your business!', 105, footerY, { align: 'center' });


    pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleDownload}>
      <Download className="h-4 w-4" />
      <span className="sr-only">Download Invoice</span>
    </Button>
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
        return 'secondary';
      case 'sent':
        return 'default';
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
              <Card key={invoice.id}>
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                  <div>
                    <p className="font-semibold">{invoice.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.invoiceNumber}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant={getStatusBadgeVariant(invoice.status) as any} size="sm" className="capitalize h-8">
                          {invoice.status}
                          <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {availableStatuses.map((status) => (
                            <DropdownMenuItem key={status} onClick={() => handleStatusChange(invoice, status)} disabled={invoice.status === status} className="capitalize">
                                Mark as {status}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="font-semibold text-lg">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Due:{' '}
                    {format(
                      new Date(
                        (invoice.dueDate as any).toDate
                          ? (invoice.dueDate as any).toDate()
                          : invoice.dueDate
                      ),
                      'PPP'
                    )}
                  </div>
                  <div className="flex items-center justify-end mt-2">
                    <DownloadInvoiceButton invoice={invoice} />
                    <AddInvoiceDialog
                      invoice={invoice}
                      currency={invoice.currency}
                    >
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </AddInvoiceDialog>
                    <DeleteInvoiceButton invoiceId={invoice.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map(invoice => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.customerName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      {format(
                        new Date(
                          (invoice.issueDate as any).toDate
                            ? (invoice.issueDate as any).toDate()
                            : invoice.issueDate
                        ),
                        'PPP'
                      )}
                    </TableCell>
                    <TableCell>
                      {format(
                        new Date(
                          (invoice.dueDate as any).toDate
                            ? (invoice.dueDate as any).toDate()
                            : invoice.dueDate
                        ),
                        'PPP'
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="w-[110px] justify-between capitalize">
                                {invoice.status}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {availableStatuses.map((status) => (
                                <DropdownMenuItem key={status} onClick={() => handleStatusChange(invoice, status)} disabled={invoice.status === status} className="capitalize">
                                    {`Mark as ${status}`}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <DownloadInvoiceButton invoice={invoice} />
                      <AddInvoiceDialog
                        invoice={invoice}
                        currency={invoice.currency}
                      >
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </AddInvoiceDialog>
                      <DeleteInvoiceButton invoiceId={invoice.id} />
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
