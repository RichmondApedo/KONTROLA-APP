'use client';

import { Firestore, collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatCurrency } from './utils';

export interface ReportData {
  title: string;
  subtitle: string;
  currency: string;
  data: any[];
  columns: { header: string; key: string; width: number }[];
}

/**
 * Universal Excel Export Utility
 */
export async function exportToExcel({ title, subtitle, columns, data, currency }: ReportData) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(title);

  // 1. Styling & Headers
  worksheet.mergeCells('A1:E1');
  worksheet.getCell('A1').value = 'KONTROLA STRATEGIC INTELLIGENCE';
  worksheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF10B981' } };

  worksheet.mergeCells('A2:E2');
  worksheet.getCell('A2').value = `${title} - ${subtitle}`;
  worksheet.getCell('A2').font = { bold: true, size: 12 };

  worksheet.addRow([]); // Spacer

  // 2. Data Table
  worksheet.columns = columns.map(col => ({
    header: col.header.toUpperCase(),
    key: col.key,
    width: col.width,
  }));

  // Style the header row
  const headerRow = worksheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF111827' }
  };

  // Add Data
  worksheet.addRows(data);

  // 3. Currency Formatting
  data.forEach((_, idx) => {
    const row = worksheet.getRow(idx + 5);
    columns.forEach((col, colIdx) => {
        if (col.header.toLowerCase().includes('amount') || col.header.toLowerCase().includes('price') || col.header.toLowerCase().includes('total')) {
            row.getCell(colIdx + 1).numFmt = `"${currency.toUpperCase()}" #,##0.00`;
        }
    });
  });

  // 4. Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Universal PDF Export Utility
 */
export async function exportToPDF({ title, subtitle, columns, data, currency }: ReportData) {
  const doc = new jsPDF();

  // 1. Branding Header
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129); // Emerald-500
  doc.text('KONTROLA', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('LIQUIDITY INTELLIGENCE TERMINAL', 14, 25);

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(title, 14, 35);
  
  doc.setFontSize(10);
  doc.text(subtitle, 14, 40);

  // 2. Data Table
  autoTable(doc, {
    startY: 50,
    head: [columns.map(c => c.header.toUpperCase())],
    body: data.map(row => columns.map(col => {
        const val = row[col.key];
        if (col.header.toLowerCase().includes('amount') || col.header.toLowerCase().includes('price') || col.header.toLowerCase().includes('total')) {
            return formatCurrency(val as number, currency);
        }
        if (val instanceof Date) return format(val, 'dd MMM yyyy');
        if (val instanceof Timestamp) return format(val.toDate(), 'dd MMM yyyy');
        return val;
    })),
    headStyles: { fillColor: [17, 24, 39] }, // Slate-900
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { top: 50 },
    styles: { fontSize: 8, font: 'helvetica' }
  });

  // 3. Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated on ${format(new Date(), 'PPpp')} • Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
  }

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

/**
 * High-Level Report: VAT & Compliance Export
 */
export async function generateVATReport(firestore: Firestore, userId: string, startDate: Date, endDate: Date, currency: string) {
    const incomeRef = collection(firestore, 'users', userId, 'incomeSources');
    const q = query(
        incomeRef, 
        where('date', '>=', startDate), 
        where('date', '<=', endDate),
        where('context', '==', 'business')
    );
    
    const snap = await getDocs(q);
    const data = snap.docs.map(doc => {
        const d = doc.data();
        const amount = d.amount || 0;
        // Standard Ghana VAT breakdown (15% VAT + 2.5% NHIL + 2.5% GETFund)
        // Simplified calculation for the report
        const vat = amount * 0.15;
        const nhil = amount * 0.025;
        const getfund = amount * 0.025;
        const levyTotal = vat + nhil + getfund;
        
        return {
            date: d.date,
            description: d.name || 'Income Entry',
            category: d.category || 'General',
            grossAmount: amount,
            vat: vat,
            nhil: nhil,
            getfund: getfund,
            totalTax: levyTotal,
            netAmount: amount - levyTotal
        };
    });

    return exportToExcel({
        title: 'VAT & Compliance Report',
        subtitle: `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`,
        currency,
        columns: [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'Category', key: 'category', width: 15 },
            { header: 'Gross Amount', key: 'grossAmount', width: 15 },
            { header: 'VAT (15%)', key: 'vat', width: 12 },
            { header: 'NHIL (2.5%)', key: 'nhil', width: 12 },
            { header: 'GETFund (2.5%)', key: 'getfund', width: 12 },
            { header: 'Total Tax', key: 'totalTax', width: 15 },
            { header: 'Net Revenue', key: 'netAmount', width: 15 },
        ],
        data
    });
}

/**
 * High-Level Report: Cash Flow Statement
 */
export async function generateCashFlowReport(firestore: Firestore, userId: string, startDate: Date, endDate: Date, currency: string) {
    const incomeRef = collection(firestore, 'users', userId, 'incomeSources');
    const expenseRef = collection(firestore, 'users', userId, 'expenses');
    
    const [incomeSnap, expenseSnap] = await Promise.all([
        getDocs(query(incomeRef, where('date', '>=', startDate), where('date', '<=', endDate))),
        getDocs(query(expenseRef, where('date', '>=', startDate), where('date', '<=', endDate)))
    ]);

    const income = incomeSnap.docs.map(d => ({ ...d.data(), type: 'INCOME' }));
    const expenses = expenseSnap.docs.map(d => ({ ...d.data(), type: 'EXPENSE' }));
    
    const combined = [...income, ...expenses].sort((a: any, b: any) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
        const dateB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });

    return exportToPDF({
        title: 'Cash Flow Statement',
        subtitle: `${format(startDate, 'MMMM d')} - ${format(endDate, 'MMMM d, yyyy')}`,
        currency,
        columns: [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'Type', key: 'type', width: 10 },
            { header: 'Category', key: 'category', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
        ],
        data: combined.map((item: any) => ({
            date: item.date,
            description: item.name || item.description || 'Transaction',
            type: item.type,
            category: item.category || 'General',
            amount: item.type === 'EXPENSE' ? -item.amount : item.amount
        }))
    });
}

/**
 * High-Level Report: Expense Distribution (ByCategory)
 */
export async function generateExpenseDistributionReport(firestore: Firestore, userId: string, startDate: Date, endDate: Date, currency: string) {
    const expenseRef = collection(firestore, 'users', userId, 'expenses');
    const snap = await getDocs(query(expenseRef, where('date', '>=', startDate), where('date', '<=', endDate)));
    
    const distribution: Record<string, { category: string, count: number, total: number }> = {};
    
    snap.docs.forEach(doc => {
        const d = doc.data();
        const cat = d.category || 'Uncategorized';
        if (!distribution[cat]) distribution[cat] = { category: cat, count: 0, total: 0 };
        distribution[cat].count++;
        distribution[cat].total += d.amount || 0;
    });

    const data = Object.values(distribution).sort((a, b) => b.total - a.total);

    return exportToPDF({
        title: 'Expense Distribution Audit',
        subtitle: `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`,
        currency,
        columns: [
            { header: 'Category', key: 'category', width: 25 },
            { header: 'Transactions', key: 'count', width: 15 },
            { header: 'Total Spend', key: 'total', width: 20 },
            { header: '% of Spend', key: 'percent', width: 15 },
        ],
        data: data.map(item => ({
            ...item,
            percent: `${((item.total / data.reduce((acc, curr) => acc + curr.total, 0)) * 100).toFixed(1)}%`
        }))
    });
}

/**
 * High-Level Report: Profit & Loss (P&L) Statement
 */
export async function generatePNLReport(firestore: Firestore, userId: string, startDate: Date, endDate: Date, currency: string) {
    const incomeRef = collection(firestore, 'users', userId, 'incomeSources');
    const expenseRef = collection(firestore, 'users', userId, 'expenses');
    
    const [incomeSnap, expenseSnap] = await Promise.all([
        getDocs(query(incomeRef, where('date', '>=', startDate), where('date', '<=', endDate))),
        getDocs(query(expenseRef, where('date', '>=', startDate), where('date', '<=', endDate)))
    ]);

    const incomeTotal = incomeSnap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
    const expenseTotal = expenseSnap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
    
    // Categorize expenses for the report
    const expenseCategories: Record<string, number> = {};
    expenseSnap.docs.forEach(doc => {
        const d = doc.data();
        const cat = d.category || 'General';
        expenseCategories[cat] = (expenseCategories[cat] || 0) + (d.amount || 0);
    });

    const data = [
        { item: 'Total Revenue', category: 'Income', amount: incomeTotal },
        { item: 'Cost of Sales / Operations', category: 'Expense', amount: -expenseTotal },
        ...Object.entries(expenseCategories).map(([cat, amt]) => ({
            item: `Operating Expense: ${cat}`,
            category: 'Expense',
            amount: -amt
        })),
        { item: 'NET PROFIT / LOSS', category: 'Summary', amount: incomeTotal - expenseTotal }
    ];

    return exportToPDF({
        title: 'Profit & Loss Statement',
        subtitle: `${format(startDate, 'MMMM d')} - ${format(endDate, 'MMMM d, yyyy')}`,
        currency,
        columns: [
            { header: 'Account / Description', key: 'item', width: 40 },
            { header: 'Classification', key: 'category', width: 20 },
            { header: 'Amount', key: 'amount', width: 20 },
        ],
        data
    });
}

/**
 * High-Level Report: Sales by Category
 */
export async function generateSalesByCategoryReport(firestore: Firestore, userId: string, startDate: Date, endDate: Date, currency: string) {
    const incomeRef = collection(firestore, 'users', userId, 'incomeSources');
    const snap = await getDocs(query(incomeRef, where('date', '>=', startDate), where('date', '<=', endDate)));
    
    const distribution: Record<string, { category: string, count: number, total: number }> = {};
    
    snap.docs.forEach(doc => {
        const d = doc.data();
        const cat = d.category || 'General Sales';
        if (!distribution[cat]) distribution[cat] = { category: cat, count: 0, total: 0 };
        distribution[cat].count++;
        distribution[cat].total += d.amount || 0;
    });

    const data = Object.values(distribution).sort((a, b) => b.total - a.total);

    return exportToPDF({
        title: 'Revenue Analysis by Category',
        subtitle: `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`,
        currency,
        columns: [
            { header: 'Sales Category', key: 'category', width: 30 },
            { header: 'Transactions', key: 'count', width: 15 },
            { header: 'Total Revenue', key: 'total', width: 20 },
            { header: '% of Total', key: 'percent', width: 15 },
        ],
        data: data.map(item => ({
            ...item,
            percent: `${((item.total / data.reduce((acc, curr) => acc + curr.total, 0)) * 100).toFixed(1)}%`
        }))
    });
}

/**
 * High-Level Report: Receivables Aging (Unpaid Invoices)
 */
export async function generateReceivablesReport(firestore: Firestore, userId: string, currency: string) {
    // Note: Receivables usually ignore the date filter and look at ALL unpaid items
    const invoiceRef = collection(firestore, 'users', userId, 'invoices');
    const snap = await getDocs(query(invoiceRef, where('status', 'in', ['sent', 'overdue', 'partially_paid'])));
    
    const data = snap.docs.map(doc => {
        const d = doc.data();
        const dueDate = d.dueDate instanceof Timestamp ? d.dueDate.toDate() : new Date(d.dueDate);
        const today = new Date();
        const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24)));
        
        return {
            invoiceNumber: d.invoiceNumber || 'INV-XXX',
            client: d.customerName || 'Unknown Client',
            date: d.issueDate || d.date,
            dueDate: d.dueDate,
            daysOverdue: daysOverdue,
            status: daysOverdue > 0 ? 'OVERDUE' : (d.status || 'SENT').toUpperCase(),
            total: d.totalAmount || d.total || 0
        };
    }).sort((a, b) => b.daysOverdue - a.daysOverdue);

    return exportToExcel({
        title: 'Receivables Aging Report',
        subtitle: `As of ${format(new Date(), 'PPP')}`,
        currency,
        columns: [
            { header: 'Invoice #', key: 'invoiceNumber', width: 15 },
            { header: 'Client', key: 'client', width: 25 },
            { header: 'Invoice Date', key: 'date', width: 15 },
            { header: 'Due Date', key: 'dueDate', width: 15 },
            { header: 'Days Overdue', key: 'daysOverdue', width: 15 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Total Amount', key: 'total', width: 15 },
        ],
        data
    });
}

/**
 * High-Level Report: Operating Burn Rate
 */
export async function generateBurnRateReport(firestore: Firestore, userId: string, currency: string) {
    const expenseRef = collection(firestore, 'users', userId, 'expenses');
    // Last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const snap = await getDocs(query(expenseRef, where('date', '>=', Timestamp.fromDate(ninetyDaysAgo))));
    
    // Group by month
    const monthlySpend: Record<string, number> = {};
    snap.docs.forEach(doc => {
        const d = doc.data();
        const date = d.date instanceof Timestamp ? d.date.toDate() : new Date(d.date);
        const monthKey = format(date, 'MMM yyyy');
        monthlySpend[monthKey] = (monthlySpend[monthKey] || 0) + (d.amount || 0);
    });
    
    const sortedMonths = Object.entries(monthlySpend).sort((a, b) => {
        return new Date(a[0]).getTime() - new Date(b[0]).getTime();
    });
    
    const totalSpend = Object.values(monthlySpend).reduce((a, b) => a + b, 0);
    const avgBurn = totalSpend / (sortedMonths.length || 1);
    
    const data = sortedMonths.map(([month, amount]) => ({
        month,
        amount,
        variance: amount - avgBurn
    }));
    
    data.push({ month: 'AVERAGE BURN RATE', amount: avgBurn, variance: 0 });

    return exportToPDF({
        title: 'Operating Burn Rate Analysis',
        subtitle: 'Last 90 Days Variance Report',
        currency,
        columns: [
            { header: 'Period (Month)', key: 'month', width: 30 },
            { header: 'Total Spend', key: 'amount', width: 25 },
            { header: 'Variance from Avg', key: 'variance', width: 25 },
        ],
        data
    });
}

/**
 * High-Level Report: Top Customers
 */
export async function generateTopCustomersReport(firestore: Firestore, userId: string, startDate: Date, endDate: Date, currency: string) {
    const incomeRef = collection(firestore, 'users', userId, 'incomeSources');
    const snap = await getDocs(query(incomeRef, where('date', '>=', startDate), where('date', '<=', endDate)));
    
    const customers: Record<string, { name: string, count: number, total: number }> = {};
    
    snap.docs.forEach(doc => {
        const d = doc.data();
        const name = d.customerName || d.name || 'General Sale';
        if (!customers[name]) customers[name] = { name, count: 0, total: 0 };
        customers[name].count++;
        customers[name].total += d.amount || 0;
    });

    const data = Object.values(customers).sort((a, b) => b.total - a.total);

    return exportToPDF({
        title: 'Top Customers Analysis',
        subtitle: `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`,
        currency,
        columns: [
            { header: 'Customer / Client Name', key: 'name', width: 40 },
            { header: 'Transactions', key: 'count', width: 20 },
            { header: 'Total Value', key: 'total', width: 20 },
        ],
        data
    });
}

/**
 * High-Level Report: Balance Sheet (Simplified for SMBs)
 */
export async function generateBalanceSheetReport(firestore: Firestore, userId: string, currency: string) {
    const incomeRef = collection(firestore, 'users', userId, 'incomeSources');
    const expenseRef = collection(firestore, 'users', userId, 'expenses');
    const goalRef = collection(firestore, 'users', userId, 'savingsGoals');
    
    const [incomeSnap, expenseSnap, goalSnap] = await Promise.all([
        getDocs(incomeRef),
        getDocs(expenseRef),
        getDocs(goalRef)
    ]);

    const incomeTotal = incomeSnap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);
    const expenseTotal = expenseSnap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);
    const savingsTotal = goalSnap.docs.reduce((acc, d) => acc + (d.data().currentAmount || 0), 0);
    
    const equity = incomeTotal - expenseTotal;

    const data = [
        { section: 'ASSETS', item: 'Cash & Equivalents (Historical Flow Balance)', amount: equity },
        { section: 'ASSETS', item: 'Goal-Based Savings', amount: savingsTotal },
        { section: 'ASSETS', item: 'TOTAL ASSETS', amount: equity + savingsTotal },
        { section: 'LIABILITIES', item: 'Outstanding Payables (Est.)', amount: 0 },
        { section: 'LIABILITIES', item: 'TOTAL LIABILITIES', amount: 0 },
        { section: 'EQUITY', item: 'Retained Earnings', amount: equity },
        { section: 'EQUITY', item: 'Savings Reserves', amount: savingsTotal },
        { section: 'EQUITY', item: 'TOTAL EQUITY', amount: equity + savingsTotal }
    ];

    return exportToPDF({
        title: 'Simplified Balance Sheet',
        subtitle: `As of ${format(new Date(), 'PPP')}`,
        currency,
        columns: [
            { header: 'Classification', key: 'section', width: 20 },
            { header: 'Account Item', key: 'item', width: 40 },
            { header: 'Amount', key: 'amount', width: 20 },
        ],
        data
    });
}

/**
 * High-Level Report: Income Tax Summary
 */
export async function generateIncomeTaxReport(firestore: Firestore, userId: string, startDate: Date, endDate: Date, currency: string) {
    const incomeRef = collection(firestore, 'users', userId, 'incomeSources');
    const snap = await getDocs(query(incomeRef, where('date', '>=', startDate), where('date', '<=', endDate), where('context', '==', 'business')));
    
    const revenue = snap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);
    
    // Simple 25% corporate tax estimation for the report
    const taxRate = 0.25;
    const estimatedTax = revenue * taxRate;

    const data = [
        { description: 'Total Business Revenue', amount: revenue },
        { description: 'Estimated Corporate Tax (25%)', amount: estimatedTax },
        { description: 'Net Income After Tax', amount: revenue - estimatedTax }
    ];

    return exportToPDF({
        title: 'Income Tax Preparation Summary',
        subtitle: `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`,
        currency,
        columns: [
            { header: 'Description', key: 'description', width: 50 },
            { header: 'Amount', key: 'amount', width: 25 },
        ],
        data
    });
}

/**
 * High-Level Report: Withholding Tax (WHT) Log
 */
export async function generateWHTReport(firestore: Firestore, userId: string, startDate: Date, endDate: Date, currency: string) {
    const incomeRef = collection(firestore, 'users', userId, 'incomeSources');
    const snap = await getDocs(query(incomeRef, where('date', '>=', startDate), where('date', '<=', endDate), where('category', '==', 'Service Fees')));
    
    const data = snap.docs.map(doc => {
        const d = doc.data();
        const amount = d.amount || 0;
        const wht = amount * 0.075; // Standard 7.5% WHT for services
        
        return {
            date: d.date,
            client: d.customerName || d.name || 'General Client',
            grossAmount: amount,
            whtAmount: wht,
            netReceived: amount - wht
        };
    });

    return exportToExcel({
        title: 'Withholding Tax (WHT) Credit Log',
        subtitle: `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`,
        currency,
        columns: [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Client / Source', key: 'client', width: 30 },
            { header: 'Gross Amount', key: 'grossAmount', width: 15 },
            { header: 'WHT (7.5%)', key: 'whtAmount', width: 15 },
            { header: 'Net Amount Received', key: 'netReceived', width: 15 },
        ],
        data
    });
}
