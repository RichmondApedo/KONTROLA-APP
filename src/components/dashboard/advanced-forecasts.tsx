'use client';

import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import type {
  Budget,
  Expense,
  IncomeSource,
  SavingsGoal,
  UserProfile,
} from '@/lib/types';
import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { BarChart3, Loader, Sparkles } from 'lucide-react';
import { generateAdvancedForecast } from '@/ai/flows/advanced-financial-forecast';
import type { AdvancedForecastOutput } from '@/ai/flows/advanced-financial-forecast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

function ForecastDisplay({ forecast }: { forecast: AdvancedForecastOutput }) {
    return (
        <div className="space-y-6 mt-6">
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
                        {forecast.scenarioAnalysis.map((item, index) => (
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
                        {forecast.actionableAdvice.map((item, index) => (
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

    const [forecast, setForecast] = useState<AdvancedForecastOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Memoize queries
    const profileDocRef = useMemo(() => user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null, [user, firestore]);
    const incomeQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/incomeSources`)) : null, [user, firestore]);
    const expensesQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/expenses`)) : null, [user, firestore]);
    const budgetsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/budgets`)) : null, [user, firestore]);
    const savingsGoalsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/savingsGoals`)) : null, [user, firestore]);
    
    // Fetch data
    const { data: profile, isLoading: profileLoading } = useDoc<UserProfile>(profileDocRef);
    const { data: incomeSources, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);
    const { data: savingsGoals, isLoading: goalsLoading } = useCollection<SavingsGoal>(savingsGoalsQuery);
    
    const canGenerate = !profileLoading && !incomeLoading && !expensesLoading && !budgetsLoading && !goalsLoading;

    const handleGenerateForecast = async () => {
        if (!canGenerate || !profile || !incomeSources || !expenses || !budgets || !savingsGoals) {
            setError('Could not generate forecast. Not all financial data is available.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setForecast(null);

        try {
            const result = await generateAdvancedForecast({
                userProfile: profile,
                incomeSources,
                expenses,
                budgets,
                savingsGoals,
            });
            setForecast(result);
        } catch (e: any) {
            console.error(e);
            setError(`An error occurred while generating the forecast: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
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
                     <Button onClick={handleGenerateForecast} disabled={isLoading || !canGenerate} size="lg">
                        {isLoading ? (
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Generate My Financial Forecast
                    </Button>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                {isLoading && (
                    <div className="mt-6 flex items-center justify-center space-x-4 rounded-lg border border-dashed p-10">
                        <Loader className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">The AI is analyzing your financial future... this can take up to 30 seconds.</p>
                    </div>
                )}
                
                {forecast && <ForecastDisplay forecast={forecast} />}
            </CardContent>
        </Card>
    );
}
