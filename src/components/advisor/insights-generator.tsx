'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPersonalizedFinancialInsights } from '@/ai/flows/personalized-financial-insights';
import type { FinancialInsightsOutput } from '@/ai/flows/personalized-financial-insights';
import { Bot, Loader, Sparkles } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { IncomeSource, Expense } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export function InsightsGenerator() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [insights, setInsights] = useState<FinancialInsightsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incomeQuery = useMemo(() => 
    user && firestore
      ? query(collection(firestore, `users/${user.uid}/incomeSources`))
      : null,
    [user, firestore]
  );
  
  const expensesQuery = useMemo(() =>
    user && firestore
      ? query(collection(firestore, `users/${user.uid}/expenses`))
      : null,
      [user, firestore]
  );

  const { data: incomeSources, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setInsights(null);
    try {
      const incomeData = incomeSources?.map(i => `${i.name} (${i.category}): ${formatCurrency(i.amount, i.currency)}`).join(', ') || 'No income data available.';
      const expenseData = expenses?.map(e => `${e.description} (${e.category}): ${formatCurrency(e.amount, e.currency)}`).join(', ') || 'No expense data available.';
      
      const result = await getPersonalizedFinancialInsights({
        incomeData,
        expenseData,
      });
      setInsights(result);
    } catch (e) {
      setError('Failed to generate insights. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };
  
  const canGenerate = !incomeLoading && !expensesLoading;

  return (
    <div className="space-y-6">
      <Button onClick={handleGenerate} disabled={isLoading || !canGenerate} size="lg">
        {isLoading ? (
          <Loader className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        Generate Financial Insights
      </Button>

      {error && (
         <Card className="border-destructive bg-destructive/10">
            <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p>{error}</p>
            </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
            <CardContent className="p-6 flex items-center justify-center space-x-4">
                <Bot className="h-8 w-8 animate-pulse text-primary" />
                <p className="text-muted-foreground">Your AI advisor is analyzing your data...</p>
            </CardContent>
        </Card>
      )}

      {insights && (
        <Card className="bg-gradient-to-br from-card to-secondary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary"/>
                Your Personalized Insights
            </CardTitle>
            <CardDescription>Here are some AI-powered recommendations based on your recent activity.</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>{insights.insights}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
