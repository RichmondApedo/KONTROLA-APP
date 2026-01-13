'use client';
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ChevronDown } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
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

    const profileDocRef = useMemoFirebase(
        () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
        [user, firestore]
    );
    const { data: profile } = useDoc<UserProfile>(profileDocRef);
    const currency = profile?.preferredCurrency || 'USD';
    const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus';

    const incomeQuery = useMemoFirebase(() => 
      user && firestore ? query(collection(firestore, 'users', user.uid, 'incomeSources')) : null, 
      [user, firestore]
    );
    const expensesQuery = useMemoFirebase(() => 
      user && firestore ? query(collection(firestore, 'users', user.uid, 'expenses')) : null,
      [user, firestore]
    );

    const { data: incomeSources, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

    const handleExportPDF = () => {
        if (!incomeSources || !expenses || !profile) {
            toast({ variant: 'destructive', title: 'Error', description: 'Data not loaded yet.'});
            return;
        }

        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Financial Report", 14, 22);
        doc.setFontSize(11);
        doc.text(`User: ${profile.firstName} ${profile.lastName}`, 14, 30);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 36);

        // Income Table
        autoTable(doc, {
            startY: 45,
            head: [['Date', 'Description', 'Category', 'Amount']],
            body: incomeSources.map(i => [
                new Date(i.date).toLocaleDateString(),
                i.name,
                i.category,
                formatCurrency(i.amount, i.currency)
            ]),
            headStyles: { fillColor: [0, 128, 128] },
            didDrawPage: (data) => {
                doc.setFontSize(12);
                doc.text("Income Sources", data.settings.margin.left, data.cursor.y - 10);
            }
        });
        
        const lastTable = (doc as any).lastAutoTable.finalY || 10;
        
        // Expenses Table
        autoTable(doc, {
            startY: lastTable + 20,
            head: [['Date', 'Description', 'Category', 'Amount']],
            body: expenses.map(e => [
                new Date(e.date).toLocaleDateString(),
                e.description,
                e.category,
                formatCurrency(e.amount, e.currency)
            ]),
            headStyles: { fillColor: [200, 0, 0] },
            didDrawPage: (data) => {
                 doc.setFontSize(12);
                 doc.text("Expenses", data.settings.margin.left, data.cursor.y - 10);
            }
        });


        doc.save("Kontrola_Report.pdf");
        toast({ title: "PDF Exported", description: "Your report has been downloaded." });
    };

    const handleExportExcel = () => {
       if (!incomeSources || !expenses) {
            toast({ variant: 'destructive', title: 'Error', description: 'Data not loaded yet.'});
            return;
        }

        const incomeSheet = XLSX.utils.json_to_sheet(
            incomeSources.map(i => ({
                Date: new Date(i.date).toLocaleDateString(),
                Description: i.name,
                Category: i.category,
                Amount: i.amount,
                Currency: i.currency,
            }))
        );
        const expenseSheet = XLSX.utils.json_to_sheet(
             expenses.map(e => ({
                Date: new Date(e.date).toLocaleDateString(),
                Description: e.description,
                Category: e.category,
                Amount: e.amount,
                Currency: e.currency,
            }))
        );

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, incomeSheet, "Income");
        XLSX.utils.book_append_sheet(workbook, expenseSheet, "Expenses");

        XLSX.writeFile(workbook, "Kontrola_Report.xlsx");
        toast({ title: "Excel Exported", description: "Your report has been downloaded." });
    };

    const isExportDisabled = incomeLoading || expensesLoading;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Reports & Analytics</h1>
                    <p className="text-muted-foreground">Deep dive into your financial trends.</p>
                </div>
                <div className="flex w-full sm:w-auto items-center justify-end gap-2">
                    <DateRangePicker className="w-full sm:w-auto" />
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
                        <OverviewChart currency={currency} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Category Breakdown</CardTitle>
                        <CardDescription>How your spending is distributed.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <ExpenseChart currency={currency} />
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
