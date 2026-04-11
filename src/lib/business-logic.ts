import { doc, collection, increment, Firestore } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Invoice, Bill, Customer } from './types';

/**
 * Processes the payment of an invoice.
 * Centralizes status update, customer revenue increment, receipt generation, and income recording.
 */
export function processInvoicePayment(
  firestore: Firestore,
  userId: string,
  invoice: Invoice,
  paymentDate: Date = new Date()
) {
  const invoiceRef = doc(firestore, 'users', userId, 'invoices', invoice.id);
  
  // 1. Update Invoice Status
  updateDocumentNonBlocking(invoiceRef, { 
    status: 'paid',
    amountPaid: invoice.totalAmount // Ensure full payment is recorded
  });

  // 2. Update Customer Metrics
  const customerRef = doc(firestore, 'users', userId, 'customers', invoice.customerId);
  updateDocumentNonBlocking(customerRef, {
    totalRevenue: increment(invoice.totalAmount),
    lastPurchaseDate: paymentDate,
  });

  // 3. Generate Receipt
  const receiptCollection = collection(firestore, 'users', userId, 'receipts');
  const receiptData = {
    userId: userId,
    invoiceId: invoice.id,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    customerPhone: invoice.customerPhone || '',
    receiptNumber: `RCPT-${Date.now().toString().slice(-6)}`,
    paymentDate: paymentDate,
    amountPaid: invoice.totalAmount,
    currency: invoice.currency,
    paymentMethod: 'Invoice Payment',
    description: `Payment for Invoice #${invoice.invoiceNumber}`,
  };
  addDocumentNonBlocking(receiptCollection, receiptData);

  // 4. Record as IncomeSource (General Ledger entry for Dashboard accuracy)
  const incomeCollection = collection(firestore, 'users', userId, 'incomeSources');
  const incomeData = {
    userId: userId,
    name: `Payment: ${invoice.customerName} (Inv #${invoice.invoiceNumber})`,
    amount: invoice.totalAmount,
    currency: invoice.currency,
    date: paymentDate,
    category: 'Invoicing',
    context: 'business',
    description: `Automated entry from paid invoice #${invoice.invoiceNumber}`,
  };
  addDocumentNonBlocking(incomeCollection, incomeData);
}

/**
 * Processes the payment of a bill.
 * Centralizes status update and expense recording.
 */
export function processBillPayment(
  firestore: Firestore,
  userId: string,
  bill: Bill,
  paymentDate: Date = new Date()
) {
  const billRef = doc(firestore, 'users', userId, 'bills', bill.id);
  
  // 1. Update Bill Status
  updateDocumentNonBlocking(billRef, { status: 'paid' });

  // 2. Record as Expense (General Ledger entry for Dashboard accuracy)
  const expenseCollection = collection(firestore, 'users', userId, 'expenses');
  const expenseData = {
    userId: userId,
    amount: bill.amount,
    currency: bill.currency,
    date: paymentDate,
    category: 'Bill Payment',
    description: `Payment for Bill: ${bill.name}`,
    context: 'business',
  };
  addDocumentNonBlocking(expenseCollection, expenseData);
}
