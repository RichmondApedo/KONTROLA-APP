'use client';

import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import type {
  Budget,
  Expense,
  IncomeSource,
  SavingsGoal,
  UserProfile,
} from '@/lib/types';
import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { BarChart3, Download, Loader, Sparkles } from 'lucide-react';
import { generateAdvancedForecast } from '@/ai/flows/advanced-financial-forecast';
import type { AdvancedForecastOutput } from '@/ai/flows/advanced-financial-forecast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { useToast } from '@/hooks/use-toast';
import type jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { format } from 'date-fns';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

function ForecastDisplay({ forecast, onExport }: { forecast: AdvancedForecastOutput; onExport: () => void; }) {
    return (
        <div className="space-y-6 mt-6 relative">
             <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="absolute -top-2 right-0"
            >
                <Download className="mr-2 h-4 w-4" />
                Export as PDF
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Short-Term Forecast (3-6 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{forecast.shortTermForecast}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Long-Term Outlook (1-5 Years)</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{forecast.longTermOutlook}</p>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Scenario Analysis</CardTitle>
                    <CardDescription>Explore potential financial scenarios and their impact.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {forecast.scenarioAnalysis.map((item: any, index: number) => (
                            <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger>{item.scenario}</AccordionTrigger>

                                <AccordionContent>{item.impact}</AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Actionable Advice</CardTitle>
                    <CardDescription>Concrete steps you can take to improve your financial health.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                        {forecast.actionableAdvice.map((item: any, index: number) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}


export function AdvancedForecasts() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [forecast, setForecast] = useState<AdvancedForecastOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Memoize queries
    const profileDocRef = useMemo(() => user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null, [user, firestore]);
    const incomeQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/incomeSources`), orderBy('date', 'desc')) : null, [user, firestore]);
    const expensesQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/expenses`), orderBy('date', 'desc')) : null, [user, firestore]);
    const budgetsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/budgets`)) : null, [user, firestore]);
    const goalsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/savingsGoals`)) : null, [user, firestore]);
    
    // Fetch data
    const { data: profile, isLoading: profileLoading } = useDoc<UserProfile>(profileDocRef);
    const { data: allIncome, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
    const { data: allExpenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: allBudgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);
    const { data: allGoals, isLoading: goalsLoading } = useCollection<SavingsGoal>(goalsQuery);

    const canGenerate = !profileLoading && !incomeLoading && !expensesLoading && !budgetsLoading && !goalsLoading;

    const handleGenerateForecast = async () => {
        if (!canGenerate || !profile || !allIncome || !allExpenses || !allBudgets || !allGoals) {
            setError("Not enough data to generate a forecast. Please add more financial history.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setForecast(null);

        const input = {
            profile: {
                firstName: profile.firstName || 'User',
                plan: profile.plan,
                preferredCurrency: profile.preferredCurrency,
            },
            allIncome: allIncome.map(i => ({ name: i?.name, amount: i?.amount, date: i?.date ? format(new Date((i.date as any).toDate ? (i.date as any).toDate() : i.date), 'PPP') : '' })),
            allExpenses: allExpenses.map(e => ({ description: e?.description, amount: e?.amount, category: e?.category, date: e?.date ? format(new Date((e.date as any).toDate ? (e.date as any).toDate() : e.date), 'PPP') : '' })),
            allBudgets: allBudgets.map(b => ({ name: b?.name, amount: b?.amount, period: b?.period, category: b?.category })),
            allSavingsGoals: allGoals.map(g => ({ name: g?.name, currentAmount: g?.currentAmount, targetAmount: g?.targetAmount })),
        };

        try {
            const result = await generateAdvancedForecast(input);
            setForecast(result);
        } catch (e: any) {
            console.error("Forecast generation error:", e);
            setError(e.message || "The AI forecast service is temporarily unavailable. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleExportForecastPDF = async () => {
        if (!forecast) return;

        toast({ title: "Generating PDF..." });
        const { default: jsPDF } = await import('jspdf');
        await import('jspdf-autotable');

        const doc = new jsPDF();
        let y = 15;

        const addSection = (title: string, content: string) => {
            if (y > 250) { // Add new page if content might overflow
                doc.addPage();
                y = 15;
            }
            doc.setFontSize(16);
            doc.text(title, 14, y);
            y += 8;
            doc.setFontSize(11);
            const splitContent = doc.splitTextToSize(content, 180);
            doc.text(splitContent, 14, y);
            y += splitContent.length * 5 + 10;
        };

        doc.setFontSize(22);
        doc.text("Advanced Financial Forecast", 105, y, { align: "center" });
        y += 15;

        addSection("Short-Term Forecast (3-6 Months)", forecast.shortTermForecast);
        addSection("Long-Term Outlook (1-5 Years)", forecast.longTermOutlook);

        doc.addPage();
        y = 15;
        doc.setFontSize(16);
        doc.text("Scenario Analysis", 14, y);
        y += 8;
        (doc as any).autoTable({
            startY: y,
            head: [['Scenario', 'Impact']],
            body: forecast.scenarioAnalysis.map(s => [s.scenario, s.impact]),
        });
        y = (doc as any).lastAutoTable.finalY + 10;
        
        addSection("Actionable Advice", forecast.actionableAdvice.join('\n\n'));

        doc.save("Kontrola_Financial_Forecast.pdf");
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 />
                    Advanced Forecasts
                </CardTitle>
                <CardDescription>
                    Utilize AI-powered forecasting to project your financial health,
                    model different scenarios, and get proactive advice on your
                    financial strategy. This requires analyzing all your financial data and may take a moment.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center gap-4">
                     <Button onClick={handleGenerateForecast} disabled={!canGenerate || isLoading} size="lg">
                        {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        {isLoading ? 'Generating Forecast...' : 'Generate My Financial Forecast'}
                    </Button>
                </div>
                {error && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertTitle>Forecast Failed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {forecast && <ForecastDisplay forecast={forecast} onExport={handleExportForecastPDF} />}
            </CardContent>
        </Card>
    );
}
