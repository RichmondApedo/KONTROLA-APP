import { OverviewChart } from "@/components/dashboard/overview-chart";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Calendar as CalendarIcon } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Reports & Analytics</h1>
                    <p className="text-muted-foreground">Deep dive into your financial trends.</p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePicker className="hidden md:block" />
                    <Button>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Spending Trends</CardTitle>
                        <CardDescription>Your income vs expenses over time.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <OverviewChart />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Category Breakdown</CardTitle>
                        <CardDescription>How your spending is distributed.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <ExpenseChart />
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
