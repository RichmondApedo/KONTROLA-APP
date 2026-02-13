'use client';
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ChevronDown } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import type { UserProfile, IncomeSource, Expense } from '@/lib/types';
import { doc, collection, query, where, Timestamp } from 'firebase/firestore'; 
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
import { addDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

// Extend jsPDF with autoTable. This is just for TypeScript. The actual import is dynamic.
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

    const profileDocRef = useMemo(
        () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
        [user, firestore]
    );
    const { data: profile } = useDoc<UserProfile>(profileDocRef);
    const currency = profile?.preferredCurrency || 'USD';
    const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus';

    const incomeQuery = useMemo(() => {
        if (!user || !firestore || !dateRange?.from) return null;
        return query(
            collection(firestore, 'users', user.uid, 'incomeSources'),
            where('date', '>=', Timestamp.fromDate(dateRange.from)),
            where('date', '<=', Timestamp.fromDate(dateRange.to || new Date()))
        );
    }, [user, firestore, dateRange]);

    const expensesQuery = useMemo(() => {
        if (!user || !firestore || !dateRange?.from) return null;
        return query(
            collection(firestore, 'users', user.uid, 'expenses'),
            where('date', '>=', Timestamp.fromDate(dateRange.from)),
            where('date', '<=', Timestamp.fromDate(dateRange.to || new Date()))
        );
    }, [user, firestore, dateRange]);

    const { data: incomeSources, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

    const reportData = useMemo(() => {
        if (!incomeSources || !expenses) return null;
        return {
            totalIncome: incomeSources.reduce((sum, i) => sum + i.amount, 0),
            totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
        };
    }, [incomeSources, expenses]);


    const handleExportPDF = async () => {
        if (!incomeSources || !expenses || !profile || !reportData) {
            toast({ variant: 'destructive', title: 'Error', description: 'Data not loaded yet.'});
            return;
        }
        
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');

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

        autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Description', 'Category', 'Amount']],
            body: incomeSources.map(i => [
                new Date((i.date as any).toDate ? (i.date as any).toDate() : i.date).toLocaleDateString(),
                i.name,
                i.category,
                formatCurrency(i.amount, i.currency)
            ]),
            headStyles: { fillColor: [0, 128, 128] },
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
            headStyles: { fillColor: [200, 0, 0] },
            didDrawPage: (data) => {
                 doc.setFontSize(14);
                 doc.text("Expenses", data.settings.margin.left, yPos - 5);
            }
        });


        doc.save("Kontrola_Report.pdf");
        toast({ title: "PDF Exported", description: "Your report has been downloaded." });
    };

    const handleExportExcel = async () => {
       if (!incomeSources || !expenses || !reportData) {
            toast({ variant: 'destructive', title: 'Error', description: 'Data not loaded yet.'});
            return;
        }
        
        const XLSX = await import('xlsx');

        const summarySheet = XLSX.utils.json_to_sheet([
            { Metric: 'Total Income', Value: reportData.totalIncome },
            { Metric: 'Total Expenses', Value: reportData.totalExpenses },
            { Metric: 'Net Flow', Value: reportData.totalIncome - reportData.totalExpenses },
        ]);
       
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
        XLSX.utils.book_append_sheet(workbook, incomeSheet, "Income");
        XLSX.utils.book_append_sheet(workbook, expenseSheet, "Expenses");

        XLSX.writeFile(workbook, "Kontrola_Report.xlsx");
        toast({ title: "Excel Exported", description: "Your report has been downloaded." });
    };
    
    const isLoading = incomeLoading || expensesLoading;
    const isExportDisabled = isLoading || !reportData;

    return (
        <div className="space-y-6">
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

            <div className="grid gap-6 lg:grid-cols-5">
                <Card className="lg:col-span-3">
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
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Category Breakdown</CardTitle>
                        <CardDescription>How your spending is distributed.</CardDescription>
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
        </div>
    );
}
