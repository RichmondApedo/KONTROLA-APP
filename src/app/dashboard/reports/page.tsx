'use client';
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ChevronDown } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useCollection, useDoc, useFirestore, useUser, useMemoFirestore } from '@/firebase';
import type { UserProfile, IncomeSource, Expense } from '@/lib/types';
import { doc, collection, query } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
import { addDays } from "date-fns";

// Extend jsPDF with autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function ReportsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: addDays(new Date(), -30),
      to: new Date(),
    });

    const profileDocRef = useMemoFirestore(
        () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
        [user, firestore]
    );
    const { data: profile } = useDoc<UserProfile>(profileDocRef);
    const currency = profile?.preferredCurrency || 'USD';
    const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus';

    const incomeQuery = useMemoFirestore(() => 
      user && firestore ? query(collection(firestore, 'users', user.uid, 'incomeSources')) : null, 
      [user, firestore]
    );
    const expensesQuery = useMemoFirestore(() => 
      user && firestore ? query(collection(firestore, 'users', user.uid, 'expenses')) : null,
      [user, firestore]
    );

    const { data: incomeSources, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

    const reportData = useMemo(() => {
        if (!incomeSources || !expenses) return null;

        const totalIncome = incomeSources.reduce((sum, i) => sum + i.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        const categoryTotals = expenses.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
        }, {} as Record<string, number>);

        const topCategories = Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        const monthlyTrends = [...incomeSources, ...expenses].reduce((acc, transaction) => {
            const date = new Date((transaction.date as any).toDate ? (transaction.date as any).toDate() : transaction.date);
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!acc[monthYear]) {
                acc[monthYear] = { income: 0, expenses: 0 };
            }
            if ('name' in transaction) { // It's an IncomeSource
                acc[monthYear].income += transaction.amount;
            } else { // It's an Expense
                acc[monthYear].expenses += transaction.amount;
            }
            return acc;
        }, {} as Record<string, { income: number, expenses: number }>);
        
        const sortedMonths = Object.keys(monthlyTrends).sort();
        const firstMonth = sortedMonths.length > 0 ? new Date(sortedMonths[0]) : new Date();
        const lastMonth = sortedMonths.length > 0 ? new Date(sortedMonths[sortedMonths.length - 1]) : new Date();
        const monthDiff = (lastMonth.getFullYear() - firstMonth.getFullYear()) * 12 + (lastMonth.getMonth() - firstMonth.getMonth()) + 1;
        
        const avgMonthlyIncome = monthDiff > 0 ? totalIncome / monthDiff : totalIncome;
        const avgMonthlyExpenses = monthDiff > 0 ? totalExpenses / monthDiff : totalExpenses;

        return {
            totalIncome,
            totalExpenses,
            topCategories,
            avgMonthlyIncome,
            avgMonthlyExpenses,
            monthlyTrends
        };

    }, [incomeSources, expenses]);


    const handleExportPDF = () => {
        if (!incomeSources || !expenses || !profile || !reportData) {
            toast({ variant: 'destructive', title: 'Error', description: 'Data not loaded yet.'});
            return;
        }

        const doc = new jsPDF();
        let yPos = 22;

        doc.setFontSize(18);
        doc.text("Financial Report", 14, yPos);
        yPos += 8;
        doc.setFontSize(11);
        doc.text(`User: ${profile.firstName} ${profile.lastName}`, 14, yPos);
        yPos += 6;
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, yPos);
        yPos += 12;

        // --- Summary Section ---
        doc.setFontSize(14);
        doc.text("Financial Summary", 14, yPos);
        yPos += 8;
        doc.setFontSize(10);
        autoTable(doc, {
            startY: yPos,
            theme: 'plain',
            body: [
                ['Total Income:', formatCurrency(reportData.totalIncome, currency)],
                ['Total Expenses:', formatCurrency(reportData.totalExpenses, currency)],
                ['Net Result:', formatCurrency(reportData.totalIncome - reportData.totalExpenses, currency)],
                ['Avg. Monthly Income:', formatCurrency(reportData.avgMonthlyIncome, currency)],
                ['Avg. Monthly Expenses:', formatCurrency(reportData.avgMonthlyExpenses, currency)],
            ]
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
        
        doc.setFontSize(12);
        doc.text("Top 5 Expense Categories", 14, yPos);
        yPos += 6;
        autoTable(doc, {
            startY: yPos,
            head: [['Category', 'Amount']],
            body: reportData.topCategories.map(([cat, amount]) => [cat, formatCurrency(amount, currency)]),
            headStyles: { fillColor: [70, 70, 70] },
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;


        // --- Detailed Tables ---
        autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Description', 'Category', 'Amount']],
            body: incomeSources.map(i => [
                new Date((i.date as any).toDate ? (i.date as any).toDate() : i.date).toLocaleDateString(),
                i.name,
                i.category,
                formatCurrency(i.amount, i.currency)
            ]),
            headStyles: { fillColor: [0, 128, 128] }, // Teal for income
            didDrawPage: (data) => {
                doc.setFontSize(14);
                doc.text("Income Sources", data.settings.margin.left, yPos - 5);
            }
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
        
        autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Description', 'Category', 'Amount']],
            body: expenses.map(e => [
                new Date((e.date as any).toDate ? (e.date as any).toDate() : e.date).toLocaleDateString(),
                e.description,
                e.category,
                formatCurrency(e.amount, e.currency)
            ]),
            headStyles: { fillColor: [200, 0, 0] }, // Red for expenses
            didDrawPage: (data) => {
                 doc.setFontSize(14);
                 doc.text("Expenses", data.settings.margin.left, yPos - 5);
            }
        });


        doc.save("Kontrola_Report.pdf");
        toast({ title: "PDF Exported", description: "Your report has been downloaded." });
    };

    const handleExportExcel = () => {
       if (!incomeSources || !expenses || !reportData) {
            toast({ variant: 'destructive', title: 'Error', description: 'Data not loaded yet.'});
            return;
        }

        const summaryData = [
            { Metric: "Total Income", Value: reportData.totalIncome },
            { Metric: "Total Expenses", Value: reportData.totalExpenses },
            { Metric: "Net Result", Value: reportData.totalIncome - reportData.totalExpenses },
            {},
            { Metric: "Top Expense Categories" },
            ...reportData.topCategories.map(([Category, Value]) => ({ Metric: Category, Value })),
        ];
        const summarySheet = XLSX.utils.json_to_sheet(summaryData, { skipHeader: true });
        XLSX.utils.sheet_set_header_array(summarySheet, ["Metric", "Value"]);

        const trendsData = Object.entries(reportData.monthlyTrends)
            .map(([month, data]) => ({
                Month: month,
                Income: data.income,
                Expenses: data.expenses,
                Net: data.income - data.expenses,
            }))
            .sort((a, b) => a.Month.localeCompare(b.Month));
        const trendsSheet = XLSX.utils.json_to_sheet(trendsData);

        const incomeSheet = XLSX.utils.json_to_sheet(
            incomeSources.map(i => ({
                Date: new Date((i.date as any).toDate ? (i.date as any).toDate() : i.date).toLocaleDateString(),
                Description: i.name,
                Category: i.category,
                Amount: i.amount,
                Currency: i.currency,
            }))
        );
        const expenseSheet = XLSX.utils.json_to_sheet(
             expenses.map(e => ({
                Date: new Date((e.date as any).toDate ? (e.date as any).toDate() : e.date).toLocaleDateString(),
                Description: e.description,
                Category: e.category,
                Amount: e.amount,
                Currency: e.currency,
            }))
        );

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
        XLSX.utils.book_append_sheet(workbook, trendsSheet, "Monthly Trends");
        XLSX.utils.book_append_sheet(workbook, incomeSheet, "Income");
        XLSX.utils.book_append_sheet(workbook, expenseSheet, "Expenses");

        XLSX.writeFile(workbook, "Kontrola_Report.xlsx");
        toast({ title: "Excel Exported", description: "Your report has been downloaded." });
    };

    const isExportDisabled = incomeLoading || expensesLoading || !reportData;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Reports &amp; Analytics</h1>
                    <p className="text-muted-foreground">Deep dive into your financial trends.</p>
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

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Spending Trends</CardTitle>
                        <CardDescription>Your income vs expenses over time.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <OverviewChart 
                            currency={currency} 
                            startDate={dateRange?.from}
                            endDate={dateRange?.to}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Category Breakdown</CardTitle>
                        <CardDescription>How your spending is distributed.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <ExpenseChart 
                            currency={currency} 
                            startDate={dateRange?.from}
                            endDate={dateRange?.to}
                        />
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Yearly Summary</CardTitle>
                    <CardDescription>Coming soon: A year-over-year comparison of your financial health.</CardDescription>
                </CardHeader>
                <CardContent className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
                    <p className="text-muted-foreground">More detailed reports will be available here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
