'use client';

import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, doc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type {
  Budget,
  Expense,
  IncomeSource,
  SavingsGoal,
  UserProfile,
} from '@/lib/types';
import { useMemo, useState } from 'react';
import { subYears } from 'date-fns';
import { Button } from '../ui/button';
import { BarChart3, Download, Loader, Sparkles } from 'lucide-react';
// import { generateAdvancedForecast } from '@/ai/flows/advanced-financial-forecast';
// import type { AdvancedForecastOutput } from '@/ai/flows/advanced-financial-forecast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { useToast } from '@/hooks/use-toast';
import type jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

type AdvancedForecastOutput = any;

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
    
    // Fetch data
    const { data: profile, isLoading: profileLoading } = useDoc<UserProfile>(profileDocRef);
    
    const canGenerate = !profileLoading;

    const handleGenerateForecast = async () => {
        setError('The AI forecast service is temporarily unavailable due to installation issues. It will be restored soon.');
        toast({
            variant: 'destructive',
            title: 'Feature Unavailable',
            description: 'The AI forecast service is temporarily unavailable.',
        });
    };
    
    const handleExportForecastPDF = async () => {
        // This function is now disabled.
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
                     <Button onClick={handleGenerateForecast} disabled={true} size="lg">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate My Financial Forecast
                    </Button>
                </div>
                 {error && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertTitle>Feature Unavailable</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
