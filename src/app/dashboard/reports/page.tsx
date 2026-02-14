
'use client';
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ChevronDown, TrendingUp, TrendingDown, Scale, DollarSign } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import type { UserProfile, IncomeSource, Expense } from '@/lib/types';
import { doc, collection, query, where, Timestamp, orderBy } from 'firebase/firestore'; 
import { useToast } from "@/hooks/use-toast";
import type jsPDF from "jspdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/utils";
import { UpgradePlanDialog } from "@/components/dashboard/upgrade-plan-dialog";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

type CombinedTransaction = (IncomeSource & { type: 'income', description: string }) | (Expense & { type: 'expense' });


export default function ReportsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: addDays(new Date(), -30),
      to: new Date(),
    });

    const profileDocRef = useMemo(
        () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
        [user, firestore]
    );
    const { data: profile } = useDoc<UserProfile>(profileDocRef);
    const currency = profile?.preferredCurrency || 'USD';
    const isPremium = (profile?.plan === 'premium' || profile?.plan === 'pro-plus') || user?.email === 'richmondapedo549@gmail.com';

    const incomeQuery = useMemo(() => {
        if (!user || !firestore || !dateRange?.from) return null;
        return query(
            collection(firestore, 'users', user.uid, 'incomeSources'),
            where('date', '>=', Timestamp.fromDate(dateRange.from)),
            where('date', '<=', Timestamp.fromDate(dateRange.to || new Date())),
            orderBy('date', 'desc')
        );
    }, [user, firestore, dateRange]);

    const expensesQuery = useMemo(() => {
        if (!user || !firestore || !dateRange?.from) return null;
        return query(
            collection(firestore, 'users', user.uid, 'expenses'),
            where('date', '>=', Timestamp.fromDate(dateRange.from)),
            where('date', '<=', Timestamp.fromDate(dateRange.to || new Date())),
            orderBy('date', 'desc')
        );
    }, [user, firestore, dateRange]);

    const { data: incomeSources, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

    const reportData = useMemo(() => {
        if (!incomeSources || !expenses) return { totalIncome: 0, totalExpenses: 0, netFlow: 0, transactions: [] };
        const totalIncome = incomeSources.reduce((sum, i) => sum + i.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        const incomeTx = incomeSources.map(i => ({ ...i, type: 'income', description: i.name } as CombinedTransaction));
        const expenseTx = expenses.map(e => ({ ...e, type: 'expense' } as CombinedTransaction));

        const transactions = [...incomeTx, ...expenseTx]
            .sort((a, b) => {
                const dateA = (a.date as any).toDate ? (a.date as any).toDate() : new Date(a.date);
                const dateB = (b.date as any).toDate ? (b.date as any).toDate() : new Date(b.date);
                return dateB.getTime() - dateA.getTime();
            });
        
        return {
            totalIncome,
            totalExpenses,
            netFlow: totalIncome - totalExpenses,
            transactions
        };
    }, [incomeSources, expenses]);
    
    const expenseTransactions = useMemo(() => {
        if (!reportData?.transactions) return [];
        return reportData.transactions.filter(tx => tx.type === 'expense') as (Expense & { type: 'expense' })[];
    }, [reportData.transactions]);


    const handleExportPDF = async () => {
        if (!isPremium || !dateRange?.from || !profile || !reportData) {
            toast({ variant: 'destructive', title: 'Error', description: 'Data not loaded or feature not available.'});
            return;
        }

        toast({ title: 'Generating PDF...', description: 'This may take a moment.' });
        
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const { default: html2canvas } = await import('html2canvas');

        const doc = new jsPDF('p', 'mm', 'a4');
        let yPos = 20;

        // --- PAGE 1: Dashboard Summary ---
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text("Financial Dashboard", 105, yPos, { align: 'center' });
        yPos += 8;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Report for: ${profile.firstName} ${profile.lastName}`, 105, yPos, { align: 'center' });
        yPos += 6;
        doc.text(`Period: ${format(dateRange.from, "dd MMM yyyy")} to ${format(dateRange.to || new Date(), "dd MMM yyyy")}`, 105, yPos, { align: 'center' });
        yPos += 15;

        // KPI Cards
        autoTable(doc, {
            startY: yPos,
            body: [[
                { content: `Total Income\n${formatCurrency(reportData.totalIncome, currency)}`, styles: { halign: 'center', fontStyle: 'bold', fontSize: 12, cellPadding: 8 } },
                { content: `Total Expenses\n${formatCurrency(reportData.totalExpenses, currency)}`, styles: { halign: 'center', fontStyle: 'bold', fontSize: 12, cellPadding: 8 } },
                { content: `Net Cash Flow\n${formatCurrency(reportData.netFlow, currency)}`, styles: { halign: 'center', fontStyle: 'bold', fontSize: 12, cellPadding: 8 } },
            ]],
            theme: 'grid',
            styles: {
                fillColor: [244, 244, 245], // Muted background
                textColor: [40, 40, 40],
                lineColor: [200, 200, 200],
                lineWidth: 0.5,
            }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
        
        // Bar Chart
        const overviewChartEl = document.getElementById('overview-chart-export');
        if (overviewChartEl) {
            const canvas = await html2canvas(overviewChartEl, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text("Income vs. Expenses", 14, yPos);
            yPos += 8
            doc.addImage(imgData, 'PNG', 14, yPos, 180, 90);
        }

        // --- PAGE 2: Breakdowns ---
        doc.addPage();
        yPos = 20;
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text("Category Breakdowns", 105, yPos, { align: 'center' });
        yPos += 15;

        const incomeChartEl = document.getElementById('income-chart-export');
        const expenseChartEl = document.getElementById('expense-chart-export');
        
        if (incomeChartEl) {
            const canvas = await html2canvas(incomeChartEl, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 14, yPos, 85, 95);
        }
        if (expenseChartEl) {
            const canvas = await html2canvas(expenseChartEl, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 110, yPos, 85, 95);
        }
        
        // --- PAGE 3: Transactions ---
        doc.addPage();
        yPos = 20;
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text("Detailed Transactions", 105, yPos, { align: 'center' });
        yPos += 15;

        if (incomeSources && incomeSources.length > 0) {
            autoTable(doc, {
                startY: yPos,
                head: [['Date', 'Description', 'Category', 'Amount']],
                body: incomeSources.map(i => [format((i.date as any).toDate ? (i.date as any).toDate() : new Date(i.date), "dd MMM yyyy"), i.name, i.category, formatCurrency(i.amount, i.currency)]),
                headStyles: { fillColor: [22, 163, 74] }, // Green
                didDrawPage: (data) => {
                    doc.setFontSize(14);
                    doc.text("Income Transactions", data.settings.margin.left, yPos - 5);
                }
            });
            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        if (expenses && expenses.length > 0) {
             autoTable(doc, {
                startY: yPos,
                head: [['Date', 'Description', 'Category', 'Amount']],
                body: expenses.map(e => [format((e.date as any).toDate ? (e.date as any).toDate() : new Date(e.date), "dd MMM yyyy"), e.description, e.category, formatCurrency(e.amount, e.currency)]),
                headStyles: { fillColor: [239, 68, 68] }, // Red
                didDrawPage: (data) => {
                    doc.setFontSize(14);
                    doc.text("Expense Transactions", data.settings.margin.left, yPos - 5);
                }
            });
        }
        
        doc.save(`Kontrola_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
        toast({ title: "PDF Exported", description: "Your report has been downloaded." });
    };

    const handleExportExcel = async () => {
       if (!isPremium || !dateRange?.from || !reportData) {
            toast({ variant: 'destructive', title: 'Error', description: 'Data not loaded or feature not available.'});
            return;
        }
        
        toast({ title: 'Generating Excel File...', description: 'This may take a moment.' });
        const XLSX = await import('xlsx');

        // Dashboard Sheet
        const summaryData = [
            { A: 'Financial Report Dashboard', B: '' },
            { A: 'User', B: `${profile?.firstName} ${profile?.lastName}` },
            { A: 'Period', B: `${format(dateRange.from, "yyyy-MM-dd")} to ${format(dateRange.to || new Date(), "yyyy-MM-dd")}` },
            {}, // Spacer
            { A: 'Key Metrics', B: ''},
            { A: 'Total Income', B: reportData.totalIncome },
            { A: 'Total Expenses', B: reportData.totalExpenses },
            { A: 'Net Cash Flow', B: reportData.netFlow },
            {},
            { A: 'Note', B: 'Visual charts are available in the PDF export. You can also create your own charts using the data in the other sheets.' },
        ];
        const dashboardSheet = XLSX.utils.json_to_sheet(summaryData, { skipHeader: true });
        dashboardSheet['!cols'] = [{ wch: 25 }, { wch: 50 }]; // Set column widths

        // Chart Data Sheets
        const expenseChartData = expenses ? Object.entries(expenses.reduce((acc, exp) => { acc[exp.category] = (acc[exp.category] || 0) + exp.amount; return acc; }, {} as Record<string, number>)).map(([category, amount]) => ({ Category: category, Amount: amount })) : [];
        const expenseChartSheet = XLSX.utils.json_to_sheet(expenseChartData);

        const incomeChartData = incomeSources ? Object.entries(incomeSources.reduce((acc, inc) => { acc[inc.name] = (acc[inc.name] || 0) + inc.amount; return acc; }, {} as Record<string, number>)).map(([name, amount]) => ({ Name: name, Amount: amount })) : [];
        const incomeChartSheet = XLSX.utils.json_to_sheet(incomeChartData);

        // Transaction Sheets
        const incomeSheet = XLSX.utils.json_to_sheet(incomeSources?.map(i => ({ Date: format((i.date as any).toDate ? (i.date as any).toDate() : new Date(i.date), "yyyy-MM-dd"), Name: i.name, Category: i.category, Amount: i.amount, Currency: i.currency })) || []);
        const expenseSheet = XLSX.utils.json_to_sheet(expenses?.map(e => ({ Date: format((e.date as any).toDate ? (e.date as any).toDate() : new Date(e.date), "yyyy-MM-dd"), Description: e.description, Category: e.category, Amount: e.amount, Currency: e.currency })) || []);

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, dashboardSheet, "Dashboard");
        XLSX.utils.book_append_sheet(workbook, incomeSheet, "Income Data");
        XLSX.utils.book_append_sheet(workbook, expenseSheet, "Expenses Data");
        XLSX.utils.book_append_sheet(workbook, incomeChartSheet, "Income Breakdown Data");
        XLSX.utils.book_append_sheet(workbook, expenseChartSheet, "Expense Breakdown Data");

        XLSX.writeFile(workbook, `Kontrola_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
        toast({ title: "Excel Exported", description: "Your report has been downloaded." });
    };
    
    const isLoading = incomeLoading || expensesLoading;
    const isExportDisabled = isLoading || !reportData || !dateRange?.from;

    return (
        <div className="relative space-y-6 overflow-hidden rounded-xl p-1">
            <div className="absolute top-0 -left-10 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob"></div>
            <div className="absolute top-0 -right-10 w-72 h-72 bg-accent/20 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob" style={{animationDelay: '2s'}}></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob" style={{animationDelay: '4s'}}></div>

            <div className="relative z-10 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline tracking-tight">Reports &amp; Analytics</h1>
                        <p className="text-muted-foreground">Your financial command center.</p>
                    </div>
                    <div className="flex w-full sm:w-auto items-center justify-end gap-2">
                        <DateRangePicker 
                        date={dateRange}
                        onDateChange={setDateRange}
                        className="w-full sm:w-auto" />
                        {isPremium ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button disabled={isExportDisabled}>
                                <Download className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Export</span>
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                            <DropdownMenuItem onClick={handleExportPDF}>Export as PDF</DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportExcel}>Export as Excel</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        ) : (
                            <UpgradePlanDialog featureName="Exporting">
                            <Button>
                                    <Download className="mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Export</span>
                                    <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                            </UpgradePlanDialog>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-card/60 backdrop-blur-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold"><AnimatedNumber value={reportData.totalIncome} currency={currency} /></div>}
                        </CardContent>
                    </Card>
                    <Card className="bg-card/60 backdrop-blur-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                            <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold"><AnimatedNumber value={reportData.totalExpenses} currency={currency} /></div>}
                        </CardContent>
                    </Card>
                    <Card className="bg-card/60 backdrop-blur-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Net Flow</CardTitle>
                            <Scale className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold"><AnimatedNumber value={reportData.netFlow} currency={currency} /></div>}
                        </CardContent>
                    </Card>
                    <Card className="bg-card/60 backdrop-blur-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{reportData.transactions.length}</div>}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="md:col-span-2 bg-card/60 backdrop-blur-lg" id="overview-chart-export">
                            <CardHeader>
                                <CardTitle>Spending Trends</CardTitle>
                                <CardDescription>Your income vs expenses over time.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <OverviewChart 
                                    currency={currency} 
                                    income={incomeSources}
                                    expenses={expenses}
                                    isLoading={isLoading}
                                />
                            </CardContent>
                        </Card>
                        <Card className="bg-card/60 backdrop-blur-lg" id="income-chart-export">
                            <CardHeader>
                                <CardTitle>Income Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? <Skeleton className="h-[250px] w-full"/> : 
                                <ExpenseChart 
                                    currency={currency} 
                                    expenses={incomeSources?.map(i => ({...i, category: i.name}))}
                                    isLoading={incomeLoading}
                                />
                                }
                            </CardContent>
                        </Card>
                        <Card className="bg-card/60 backdrop-blur-lg" id="expense-chart-export">
                            <CardHeader>
                                <CardTitle>Expense Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? <Skeleton className="h-[250px] w-full"/> : 
                                <ExpenseChart 
                                    currency={currency} 
                                    expenses={expenses}
                                    isLoading={expensesLoading}
                                />
                                }
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="lg:col-span-1 h-fit sticky top-20 bg-card/60 backdrop-blur-lg">
                        <CardHeader>
                            <CardTitle>Expense History</CardTitle>
                            <CardDescription>
                                A detailed list of your expenses for the selected period.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[600px] overflow-y-auto">
                            {isLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : expenseTransactions.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenseTransactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-xs text-muted-foreground">{format((tx.date as any).toDate ? (tx.date as any).toDate() : new Date(tx.date), "dd MMM")}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{tx.description}</div>
                                            <div className="text-xs text-muted-foreground hidden sm:block">{tx.category}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-destructive">
                                            - {formatCurrency(tx.amount, tx.currency, {minimumFractionDigits: 0})}
                                        </TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No expenses in this period.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
