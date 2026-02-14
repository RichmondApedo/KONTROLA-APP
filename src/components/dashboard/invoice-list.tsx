'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import type { Invoice, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';
import { AddInvoiceDialog } from './add-invoice-dialog';
import { Pencil, Trash2, Download, Search } from 'lucide-react';
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
import { Badge } from '../ui/badge';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
    if (!profile || !user) {
      toast({
        variant: 'destructive',
        title: 'Could not generate PDF.',
        description: 'User profile not found.',
      });
      return;
    }

    toast({ title: 'Generating Invoice PDF...' });

    const pdf = new jsPDF();

    // Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text('INVOICE', 14, 22);

    pdf.setFontSize(10);
    pdf.text(invoice.invoiceNumber, 196, 22, { align: 'right' });

    // From/To
    const fromX = 14;
    const toX = 110;
    let y = 40;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Bill From:', fromX, y);
    pdf.text('Bill To:', toX, y);
    y += 6;
    
    let fromY = y;
    let toY = y;

    pdf.setFont('helvetica', 'normal');

    if (profile.businessName) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(profile.businessName, fromX, fromY);
        fromY += 5;
        pdf.setFont('helvetica', 'normal');
    }
    pdf.text(`${profile.firstName} ${profile.lastName}`, fromX, fromY);
    fromY += 5;
    pdf.text(profile.email || '', fromX, fromY);

    pdf.text(invoice.customerName, toX, toY);
    
    y = Math.max(fromY, toY) + 10;

    // Dates
    pdf.setFont('helvetica', 'bold');
    pdf.text('Issue Date:', fromX, y);
    pdf.text('Due Date:', toX, y);
    y += 6;

    pdf.setFont('helvetica', 'normal');
    const issueDate = (invoice.issueDate as any).toDate
      ? (invoice.issueDate as any).toDate()
      : new Date(invoice.issueDate);
    const dueDate = (invoice.dueDate as any).toDate
      ? (invoice.dueDate as any).toDate()
      : new Date(invoice.dueDate);
    pdf.text(format(issueDate, 'PPP'), fromX, y);
    pdf.text(format(dueDate, 'PPP'), toX, y);
    y += 15;

    // Items Table
    pdf.autoTable({
      startY: y,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: [
        [
          invoice.description,
          1,
          formatCurrency(invoice.amount, invoice.currency),
          formatCurrency(invoice.amount, invoice.currency),
        ],
      ],
      theme: 'striped',
      headStyles: { fillColor: [34, 139, 34] },
    });

    y = (pdf as any).lastAutoTable.finalY + 20;

    // Total
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      `Total: ${formatCurrency(invoice.amount, invoice.currency)}`,
      196,
      y,
      { align: 'right' }
    );

    // Footer
    let footerY = pdf.internal.pageSize.getHeight() - 20;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Thank you for your business!', 105, footerY, {
      align: 'center',
    });

    // Save
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

  const getStatusBadge = (status: Invoice['status']) => {
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
                  <Badge
                    variant={getStatusBadge(invoice.status)}
                    className="capitalize"
                  >
                    {invoice.status}
                  </Badge>
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
                      <Badge
                        variant={getStatusBadge(invoice.status)}
                        className="capitalize"
                      >
                        {invoice.status}
                      </Badge>
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
