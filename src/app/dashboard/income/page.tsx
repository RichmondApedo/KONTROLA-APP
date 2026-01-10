import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { transactions } from "@/lib/placeholder-data";
import type { Transaction } from "@/lib/placeholder-data";
import { formatCurrency } from "@/lib/utils";
import { PlusCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function IncomePage() {
    const incomeTransactions = transactions.filter(t => t.type === 'income');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Income</h1>
                    <p className="text-muted-foreground">Track and manage your income sources.</p>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Income
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Income History</CardTitle>
                    <CardDescription>A list of all your recorded income.</CardDescription>
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
                            {incomeTransactions.map((transaction: Transaction) => (
                                <TableRow key={transaction.id}>
                                    <TableCell className="font-medium">{transaction.description}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{transaction.category}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-accent-foreground">{formatCurrency(transaction.amount)}</TableCell>
                                    <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
