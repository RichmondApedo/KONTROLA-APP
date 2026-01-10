import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { transactions } from "@/lib/placeholder-data";
import type { Transaction } from "@/lib/placeholder-data";
import { formatCurrency } from "@/lib/utils";
import { PlusCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExpenseChart } from "@/components/dashboard/expense-chart";

export default function ExpensesPage() {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');

    return (
        <div className="grid gap-6 md:grid-cols-5">
            <div className="md:col-span-3 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold font-headline tracking-tight">Expenses</h1>
                        <p className="text-muted-foreground">Track and manage your daily spending.</p>
                    </div>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Expense History</CardTitle>
                        <CardDescription>A list of all your recorded expenses.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenseTransactions.map((transaction: Transaction) => (
                                    <TableRow key={transaction.id}>
                                        <TableCell className="font-medium">{transaction.description}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{transaction.category}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-destructive">{formatCurrency(transaction.amount)}</TableCell>
                                        <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                 <ExpenseChart />
            </div>
        </div>
    );
}
