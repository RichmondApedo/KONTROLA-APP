'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPersonalizedFinancialInsights } from '@/ai/flows/personalized-financial-insights';
import type { FinancialInsightsOutput, FinancialInsightsInput } from '@/ai/flows/personalized-financial-insights';
import { Bot, Loader, Sparkles } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { IncomeSource, Expense, UserProfile, SavingsGoal } from '@/lib/types';


export function InsightsGenerator() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [insights, setInsights] = useState<FinancialInsightsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileDocRef = useMemo(() => user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null, [user, firestore]);
  const incomeQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/incomeSources`)) : null, [user, firestore]);
  const expensesQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/expenses`)) : null, [user, firestore]);
  const savingsGoalsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/savingsGoals`)) : null, [user, firestore]);

  const { data: profile, isLoading: profileLoading } = useDoc<UserProfile>(profileDocRef);
  const { data: incomeSources, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
  const { data: savingsGoals, isLoading: goalsLoading } = useCollection<SavingsGoal>(savingsGoalsQuery);
  
  const canGenerate = !profileLoading && !incomeLoading && !expensesLoading && !goalsLoading;

  const handleGenerate = async () => {
    if (!canGenerate || !profile || !incomeSources || !expenses || !savingsGoals) {
        setError('Cannot generate insights. Please make sure you have some income, expenses, and at least one savings goal.');
        return;
    }
      
    setIsLoading(true);
    setError(null);
    setInsights(null);

    try {
      // JSON.parse(JSON.stringify(...)) is a trick to convert Firestore Timestamps to strings
      const plainProfile = JSON.parse(JSON.stringify(profile));
      const plainIncome = JSON.parse(JSON.stringify(incomeSources));
      const plainExpenses = JSON.parse(JSON.stringify(expenses));
      const plainGoals = JSON.parse(JSON.stringify(savingsGoals));

      const personalIncome = plainIncome.filter((i: IncomeSource) => i.context !== 'business');
      const personalExpenses = plainExpenses.filter((e: Expense) => e.context !== 'business');
      
      const businessIncome = plainIncome.filter((i: IncomeSource) => i.context === 'business');
      const businessExpenses = plainExpenses.filter((e: Expense) => e.context === 'business');
      
      const input: FinancialInsightsInput = {
          userProfile: plainProfile,
          personalData: {
              incomeSources: personalIncome,
              expenses: personalExpenses,
              savingsGoals: plainGoals,
          },
      };

      if (profile.plan === 'pro-plus' && (businessIncome.length > 0 || businessExpenses.length > 0)) {
          input.businessData = {
              incomeSources: businessIncome,
              expenses: businessExpenses
          };
      }

      const result = await getPersonalizedFinancialInsights(input);
      setInsights(result);
    } catch (e) {
      setError('Failed to generate insights. The AI advisor might be busy. Please try again later.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

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
         <Card className="border-destructive bg-destructive/20">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary"/>
                Your Personalized Insights
            </CardTitle>
            <CardDescription>Here are some AI-powered recommendations based on your financial activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: insights.insights }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
