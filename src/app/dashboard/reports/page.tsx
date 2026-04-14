'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ChevronDown, TrendingUp, TrendingDown, Scale, DollarSign } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import type { IncomeSource, Expense, CombinedTransaction } from '@/lib/types';
import { collection, query, where, Timestamp, orderBy } from 'firebase/firestore'; 
import { useToast } from "@/hooks/use-toast";
import type jsPDF from "jspdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency, cn, preciseRound } from "@/lib/utils";
import { UpgradePlanDialog } from "@/components/dashboard/upgrade-plan-dialog";
import { useMemo, useState, useEffect } from "react";
import type { DateRange } from "react-day-picker";
import { addDays, format, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from "next/dynamic";

const OverviewChart = dynamic(() => import('@/components/dashboard/overview-chart').then(mod => mod.OverviewChart), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
  ssr: false,
});
const IncomeChart = dynamic(() => import('@/components/dashboard/income-chart').then(mod => mod.IncomeChart), {
  loading: () => <Skeleton className="h-[450px] w-full" />,
  ssr: false,
});
const ExpenseChart = dynamic(() => import('@/components/dashboard/expense-chart').then(mod => mod.ExpenseChart), {
  loading: () => <Skeleton className="h-[450px] w-full" />,
  ssr: false,
});
const CategoryIntelligence = dynamic(() => import('@/components/dashboard/category-intelligence').then(mod => mod.CategoryIntelligence), {
  loading: () => <Skeleton className="h-[450px] w-full" />,
  ssr: false,
});
const BudgetPerformance = dynamic(() => import('@/components/dashboard/budget-performance').then(mod => mod.BudgetPerformance), {
  loading: () => <Skeleton className="h-[350px] w-full" />,
  ssr: false,
});

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}


export default function ReportsPage() {
    const { user } = useUser();
    const { profile, activeProfileId } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();

    const isDelegate = activeProfileId && user && activeProfileId !== user.uid;

    const [context, setContext] = useState<'personal' | 'business'>(isDelegate ? 'business' : 'personal');

    useEffect(() => {
        if (isDelegate) {
            setContext('business');
        }
    }, [isDelegate]);

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });


    const currency = profile?.preferredCurrency || 'ghs';
    
    const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
    const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || isAdmin;
    const isProPlus = profile?.plan === 'pro-plus' || isAdmin;

    const incomeQuery = useMemo(() => {
        if (!user || !firestore || !dateRange?.from) return null;

        const from = startOfDay(dateRange.from);
        const to = endOfDay(dateRange.to || dateRange.from);

        return query(
            collection(firestore, 'users', user.uid, 'incomeSources'),
            where('date', '>=', Timestamp.fromDate(from)),
            where('date', '<=', Timestamp.fromDate(to)),
            orderBy('date', 'desc')
        );
    }, [user, firestore, dateRange]);

    const expensesQuery = useMemo(() => {
        if (!user || !firestore || !dateRange?.from) return null;
        
        const from = startOfDay(dateRange.from);
        const to = endOfDay(dateRange.to || dateRange.from);

        return query(
            collection(firestore, 'users', user.uid, 'expenses'),
            where('date', '>=', Timestamp.fromDate(from)),
            where('date', '<=', Timestamp.fromDate(to)),
            orderBy('date', 'desc')
        );
    }, [user, firestore, dateRange]);

    const { data: allIncomeSources, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
    const { data: allExpenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

    const { incomeSources, expenses } = useMemo(() => {
        if (context === 'business') {
            const businessIncome = allIncomeSources?.filter(i => i.context === 'business') ?? [];
            const businessExpenses = allExpenses?.filter(e => e.context === 'business') ?? [];
            return { incomeSources: businessIncome, expenses: businessExpenses };
        }
        // Personal context: includes items marked 'personal' or with no context
        const personalIncome = allIncomeSources?.filter(i => i.context !== 'business') ?? [];
        const personalExpenses = allExpenses?.filter(e => e.context !== 'business') ?? [];
        return { incomeSources: personalIncome, expenses: personalExpenses };
    }, [allIncomeSources, allExpenses, context]);

    const reportData = useMemo(() => {
        if (!incomeSources || !expenses) return { totalIncome: 0, totalExpenses: 0, netFlow: 0, transactions: [] };
        const totalIncome = incomeSources.reduce((sum, i) => sum + i.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        const incomeTx = incomeSources.map(i => ({ ...i, type: 'income', description: i.name || 'Unnamed Income' } as CombinedTransaction));
        const expenseTx = expenses.map(e => ({ ...e, type: 'expense' } as CombinedTransaction));

        const transactions = [...incomeTx, ...expenseTx]
            .sort((a, b) => {
                const dateA = (a.date as any).toDate ? (a.date as any).toDate() : new Date(a.date);
                const dateB = (b.date as any).toDate ? (b.date as any).toDate() : new Date(b.date);
                return dateB.getTime() - dateA.getTime();
            });
        
        return {
            totalIncome: preciseRound(totalIncome),
            totalExpenses: preciseRound(totalExpenses),
            netFlow: preciseRound(totalIncome - totalExpenses),
            transactions
        };
    }, [incomeSources, expenses]);
    
    const expenseTransactions = useMemo(() => {
        if (!reportData?.transactions) return [];
        return reportData.transactions.filter(tx => tx.type === 'expense') as (Expense & { type: 'expense' })[];
    }, [reportData.transactions]);


    const handleExportPDF = async () => {
        if (!isPremium || !dateRange?.from || !profile || !reportData || !incomeSources) {
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
        doc.text(`${context.charAt(0).toUpperCase() + context.slice(1)} Financial Dashboard`, 105, yPos, { align: 'center' });
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
                body: incomeSources.map(i => [format((i.date as any).toDate ? (i.date as any).toDate() : new Date(i.date), "dd MMM yyyy"), i.name || 'Unnamed Income', i.category, formatCurrency(i.amount, i.currency)]),
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
        
        doc.save(`Kontrola_${context}_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
        toast({ title: "PDF Exported", description: "Your report has been downloaded." });
    };

    const handleExportExcel = async () => {
       if (!isPremium || !dateRange?.from || !reportData || !profile || !incomeSources) {
            toast({ variant: 'destructive', title: 'Error', description: 'Data not loaded or feature not available.'});
            return;
        }
        
        toast({ title: 'Generating Excel File...', description: 'This may take a moment.' });
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        
        // 1. Dashboard Summary Sheet
        const dashboardSheet = workbook.addWorksheet('Dashboard');
        dashboardSheet.columns = [
            { header: 'Metric', key: 'metric', width: 25 },
            { header: 'Value', key: 'value', width: 50 },
        ];
        
        dashboardSheet.addRows([
            { metric: `${context.charAt(0).toUpperCase() + context.slice(1)} Financial Report`, value: '' },
            { metric: 'User', value: `${profile?.firstName} ${profile?.lastName}` },
            { metric: 'Period', value: `${format(dateRange.from, "yyyy-MM-dd")} to ${format(dateRange.to || new Date(), "yyyy-MM-dd")}` },
            {}, // Spacer
            { metric: 'Key Metrics', value: ''},
            { metric: 'Total Income', value: reportData.totalIncome },
            { metric: 'Total Expenses', value: reportData.totalExpenses },
            { metric: 'Net Cash Flow', value: reportData.netFlow },
            {},
            { metric: 'Note', value: 'Visual charts are available in the PDF export. You can also create your own charts using the raw data in the other sheets.' },
        ]);

        // 2. Income Data Sheet
        const incomeSheet = workbook.addWorksheet('Income Data');
        incomeSheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Currency', key: 'currency', width: 10 },
        ];
        incomeSheet.addRows(incomeSources?.map(i => ({
            date: format((i.date as any).toDate ? (i.date as any).toDate() : new Date(i.date), "yyyy-MM-dd"),
            name: i.name || 'Unnamed Income',
            category: i.category,
            amount: i.amount,
            currency: i.currency
        })) || []);

        // 3. Expenses Data Sheet
        const expenseSheet = workbook.addWorksheet('Expenses Data');
        expenseSheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Description', key: 'description', width: 35 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Currency', key: 'currency', width: 10 },
        ];
        expenseSheet.addRows(expenses?.map(e => ({
            date: format((e.date as any).toDate ? (e.date as any).toDate() : new Date(e.date), "yyyy-MM-dd"),
            description: e.description,
            category: e.category,
            amount: e.amount,
            currency: e.currency
        })) || []);

        // 4. Breakdown Data (Charts)
        const incomeBreakdownSheet = workbook.addWorksheet('Income Breakdown');
        incomeBreakdownSheet.columns = [ { header: 'Name', key: 'name', width: 30 }, { header: 'Amount', key: 'amount', width: 15 } ];
        const incomeChartData = incomeSources ? Object.entries(incomeSources.reduce((acc, inc) => { const name = inc.name || 'Unnamed Income'; acc[name] = (acc[name] || 0) + inc.amount; return acc; }, {} as Record<string, number>)).map(([name, amount]) => ({ name, amount })) : [];
        incomeBreakdownSheet.addRows(incomeChartData);

        const expenseBreakdownSheet = workbook.addWorksheet('Expense Breakdown');
        expenseBreakdownSheet.columns = [ { header: 'Category', key: 'category', width: 30 }, { header: 'Amount', key: 'amount', width: 15 } ];
        const expenseChartData = expenses ? Object.entries(expenses.reduce((acc, exp) => { acc[exp.category] = (acc[exp.category] || 0) + exp.amount; return acc; }, {} as Record<string, number>)).map(([category, amount]) => ({ category, amount })) : [];
        expenseBreakdownSheet.addRows(expenseChartData);

        // Generate and Download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Kontrola_${context}_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
        anchor.click();
        window.URL.revokeObjectURL(url);

        toast({ title: "Excel Exported", description: "Your secure report has been downloaded." });
    };
    
    const isLoading = incomeLoading || expensesLoading;
    const isExportDisabled = isLoading || !reportData || !dateRange?.from;

    return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
                <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground sm:text-5xl">Intelligence</h1>
                <p className="text-muted-foreground mt-1 text-lg font-medium">Deep-dive analytics and high-fidelity financial reporting.</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <div className="glass-card p-0.5 rounded-xl shadow-soft">
                  <DateRangePicker 
                  date={dateRange}
                  onDateChange={setDateRange}
                  className="w-full sm:w-auto border-0 bg-transparent" />
                </div>
                {isPremium ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button disabled={isExportDisabled} className="w-full sm:w-auto shadow-lg shadow-primary/20">
                        <Download className="mr-2 h-4 w-4" />
                        <span>Export</span>
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="glass-card shadow-premium border-border/40">
                    <DropdownMenuItem onClick={handleExportPDF} className="font-bold text-xs uppercase tracking-widest cursor-pointer">Export as PDF</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportExcel} className="font-bold text-xs uppercase tracking-widest cursor-pointer">Export as Excel</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                ) : (
                    <UpgradePlanDialog featureName="Exporting">
                    <Button className="w-full sm:w-auto shadow-lg shadow-primary/20">
                            <Download className="mr-2 h-4 w-4" />
                            <span>Export</span>
                            <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                    </UpgradePlanDialog>
                )}
            </div>
        </div>

        {isProPlus && !isDelegate && (
            <Tabs value={context} onValueChange={(value) => setContext(value as 'personal' | 'business')}>
                <TabsList className="grid w-full grid-cols-2 max-w-sm glass-card p-1 shadow-soft">
                    <TabsTrigger value="personal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs uppercase tracking-widest">Personal</TabsTrigger>
                    <TabsTrigger value="business" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs uppercase tracking-widest">Business</TabsTrigger>
                </TabsList>
            </Tabs>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card shadow-premium border-border/40 group hover:border-emerald-500/30 transition-all duration-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Revenue Influx</CardTitle>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-3xl font-black tracking-tighter text-foreground group-hover:text-emerald-500 transition-colors">{formatCurrency(reportData.totalIncome, currency)}</div>}
                    <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground mt-1">Total Assets Captured</p>
                </CardContent>
            </Card>
            <Card className="glass-card shadow-premium border-border/40 group hover:border-destructive/30 transition-all duration-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Capital Outflow</CardTitle>
                    <TrendingDown className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-3xl font-black tracking-tighter text-foreground group-hover:text-destructive transition-colors">{formatCurrency(reportData.totalExpenses, currency)}</div>}
                    <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground mt-1">Resource Consumption</p>
                </CardContent>
            </Card>
            <Card className="glass-card shadow-premium border-border/40 group hover:border-primary/30 transition-all duration-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Net Liquidity</CardTitle>
                    <Scale className={cn("h-4 w-4", reportData.netFlow >= 0 ? "text-emerald-500" : "text-destructive")} />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className={cn("text-3xl font-black tracking-tighter transition-colors", reportData.netFlow >= 0 ? "text-foreground group-hover:text-emerald-500" : "text-destructive")}>{formatCurrency(reportData.netFlow, currency)}</div>}
                    <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground mt-1">Current Standing</p>
                </CardContent>
            </Card>
            <Card className="glass-card shadow-premium border-border/40 group hover:border-primary/30 transition-all duration-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Activity Density</CardTitle>
                    <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-3xl font-black tracking-tighter text-foreground transition-colors">{reportData.transactions.length}</div>}
                    <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground mt-1">Unique Financial Events</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="md:col-span-2 glass-card shadow-premium border-border/40" id="overview-chart-export">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Velocity Analytics</CardTitle>
                        <CardDescription className="text-xs uppercase tracking-tight opacity-70">Interaction mapping of capital flow over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <OverviewChart 
                            currency={currency} 
                            income={incomeSources}
                            expenses={expenses}
                            isLoading={isLoading}
                            dateRefs={dateRange ? { startOfMonth: dateRange.from!, endOfMonth: dateRange.to! } : undefined}
                        />
                    </CardContent>
                </Card>
                <div id="income-chart-export" className="glass-card shadow-premium border-border/40 rounded-2xl p-4">
                    <IncomeChart 
                        currency={currency} 
                        incomeSources={incomeSources}
                        isLoading={incomeLoading}
                    />
                </div>
                <div id="expense-chart-export" className="glass-card shadow-premium border-border/40 rounded-2xl p-4">
                   <ExpenseChart 
                        currency={currency} 
                        expenses={expenses}
                        isLoading={expensesLoading}
                    />
                </div>
                <div className="md:col-span-2">
                    <CategoryIntelligence 
                        currency={currency} 
                        expenses={expenses}
                        isLoading={expensesLoading}
                    />
                </div>
                <div className="md:col-span-2">
                    <BudgetPerformance
                        currency={currency}
                        expenses={expenses}
                        isLoading={expensesLoading}
                        dateRange={dateRange}
                    />
                </div>
            </div>

            <Card className="lg:col-span-1 h-fit sticky top-20 glass-card shadow-premium border-border/40 overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Audit Log</CardTitle>
                    <CardDescription className="text-xs uppercase tracking-tight opacity-70">
                        Granular event tracking for the selected period
                    </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto pt-4 px-0">
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : expenseTransactions.length > 0 ? (
                            <>
                                {/* Mobile View */}
                                <div className="space-y-3 lg:hidden">
                                    {expenseTransactions.map((tx) => (
                                        <Card key={tx.id} className="bg-muted/50">
                                            <CardContent className="p-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium">{tx.description}</p>
                                                        <p className="text-xs text-muted-foreground">{tx.category}</p>
                                                    </div>
                                                    <p className="font-semibold text-destructive">- {formatCurrency(tx.amount, tx.currency, {minimumFractionDigits: 0})}</p>
                                                </div>
                                                <p className="text-xs text-muted-foreground text-right mt-1">{format((tx.date as any).toDate ? (tx.date as any).toDate() : new Date(tx.date), "dd MMM, yyyy")}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                {/* Desktop View */}
                                <div className="hidden lg:block">
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
                                </div>
                            </>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No expenses in this period.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
