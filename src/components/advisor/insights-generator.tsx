'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { getPersonalizedFinancialInsights } from '@/ai/flows/personalized-financial-insights';
import type { FinancialInsightsOutput, FinancialInsightsInput } from '@/ai/flows/personalized-financial-insights';
import {
  Bot,
  Loader,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Briefcase,
  ChevronRight,
} from 'lucide-react';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import type { IncomeSource, Expense } from '@/lib/types';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Progress } from '../ui/progress';
import { AddBudgetDialog } from '../dashboard/add-budget-dialog';
import { AddGoalDialog } from '../dashboard/add-goal-dialog';

function InsightsDisplay({ insights, onActionClick }: { insights: FinancialInsightsOutput, onActionClick: (action: any) => void; }) {
  const getSeverityIcon = (severity: 'positive' | 'neutral' | 'warning') => {
    switch (severity) {
      case 'positive':
        return <ShieldCheck className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bot className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getSeverityClass = (severity: 'positive' | 'neutral' | 'warning') => {
     switch (severity) {
      case 'positive':
        return 'border-green-500/50 bg-green-500/10';
      case 'warning':
        return 'border-yellow-500/50 bg-yellow-500/10';
      default:
        return '';
    }
  }

  return (
    <div className="space-y-6">
      <Alert className="border-primary/50 bg-primary/10">
        <Bot className="h-5 w-5 text-primary" />
        <AlertTitle className="font-semibold text-primary">AI Summary</AlertTitle>
        <AlertDescription>
          {insights.overallSummary}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp /> Savings Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{insights.savingsRate.rate.toFixed(1)}%</p>
            <Progress value={Math.max(0, insights.savingsRate.rate)} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">{insights.savingsRate.analysis}</p>
          </CardContent>
        </Card>
      </div>
      
       <div>
        <h3 className="text-lg font-semibold mb-4">Actionable Recommendations</h3>
         <div className="space-y-4">
            {insights.actionableRecommendations.map((rec: any, index: number) => (
                <Card key={index} className="shadow-lg">
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                           <div className="p-2 bg-primary/10 rounded-full">
                                <Lightbulb className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-lg">{rec.title}</CardTitle>
                        </div>
                        <CardDescription>{rec.description}</CardDescription>
                    </CardHeader>
                    {rec.action.type !== 'INFO_ONLY' && (
                        <CardFooter>
                            <Button onClick={() => onActionClick(rec.action)}>
                                <span>{rec.action.type === 'CREATE_BUDGET' ? 'Create This Budget' : 'Set This Goal'}</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            ))}
        </div>
      </div>

       <div>
        <h3 className="text-lg font-semibold mb-4">Key Observations</h3>
        <div className="space-y-4">
          {insights.keyObservations.map((obs: any, index: number) => (
            <Alert key={index} className={getSeverityClass(obs.severity)}>
              {getSeverityIcon(obs.severity)}
              <AlertTitle>{obs.title}</AlertTitle>
              <AlertDescription>
                {obs.description}
              </AlertDescription>
            </Alert>
          ))}
        </div>
       </div>
       
       {insights.businessInsights && (
        <div>
            <h3 className="text-lg font-semibold mb-4">Business Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                         <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Briefcase /> Profit Margin
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{insights.businessInsights.profitMargin.margin.toFixed(1)}%</p>
                        <Progress value={Math.max(0, insights.businessInsights.profitMargin.margin)} className="mt-2 h-2" />
                        <p className="text-xs text-muted-foreground mt-2">{insights.businessInsights.profitMargin.analysis}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                         <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Sparkles /> Recommendation
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <p className="text-sm text-muted-foreground">{insights.businessInsights.recommendation}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
       )}
    </div>
  );
}


export function InsightsGenerator() {
  const { user } = useUser();
  const { profile } = useUserProfile();
  const firestore = useFirestore();

  const [insights, setInsights] = useState<FinancialInsightsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'budget' | 'goal' | null>(null);
  const [dialogSuggestion, setDialogSuggestion] = useState<any>(null);


  // Fetch this month's data for analysis
  const thisMonthStart = useMemo(() => startOfMonth(new Date()), []);
  const thisMonthEnd = useMemo(() => endOfMonth(new Date()), []);

  const incomeQuery = useMemo(() => user ? query(
    collection(firestore!, `users/${user.uid}/incomeSources`),
    where('date', '>=', Timestamp.fromDate(thisMonthStart)),
    where('date', '<=', Timestamp.fromDate(thisMonthEnd))
  ) : null, [user, firestore, thisMonthStart, thisMonthEnd]);

  const expensesQuery = useMemo(() => user ? query(
    collection(firestore!, `users/${user.uid}/expenses`),
    where('date', '>=', Timestamp.fromDate(thisMonthStart)),
    where('date', '<=', Timestamp.fromDate(thisMonthEnd))
  ) : null, [user, firestore, thisMonthStart, thisMonthEnd]);

  const { data: income, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

  const canGenerate = !incomeLoading && !expensesLoading;
  
  const handleActionClick = (action: any) => {
    if (action.type === 'CREATE_BUDGET') {
      setDialogSuggestion(action.details);
      setDialogType('budget');
      setDialogOpen(true);
    } else if (action.type === 'SET_GOAL') {
      setDialogSuggestion(action.details);
      setDialogType('goal');
      setDialogOpen(true);
    }
  };

  const handleGenerate = async () => {
    if (!profile || !income || !expenses || !canGenerate) {
      setError("Not enough data to generate insights. Please add some income and expenses for this month.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setInsights(null);

    const inputData: FinancialInsightsInput = {
      profile: { 
        firstName: profile.firstName || 'User',
        plan: profile.plan,
        preferredCurrency: profile.preferredCurrency
      },
      income: income.map(i => ({
        amount: i.amount,
        category: i.category,
        name: i.name,
        date: format(new Date((i.date as any).toDate ? (i.date as any).toDate() : i.date), 'PPP'),
        context: i.context,
      })),
      expenses: expenses.map(e => ({
        amount: e.amount,
        category: e.category,
        description: e.description,
        date: format(new Date((e.date as any).toDate ? (e.date as any).toDate() : e.date), 'PPP'),
        context: e.context,
      })),
    };

    try {
      const result = await getPersonalizedFinancialInsights(inputData);
      setInsights(result);
    } catch (e: any) {
      console.error(e);
      setError("Sorry, the AI advisor couldn't generate insights at this time. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button onClick={handleGenerate} disabled={!canGenerate || isLoading} size="lg">
        {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {isLoading ? 'Analyzing...' : 'Generate Financial Insights'}
      </Button>

      {error && (
         <Card className="border-destructive bg-destructive/20">
            <CardHeader>
                <CardTitle className="text-destructive">An Error Occurred</CardTitle>
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

      {insights && <InsightsDisplay insights={insights} onActionClick={handleActionClick} />}

      {dialogType === 'budget' && (
        <AddBudgetDialog 
          currency={profile?.preferredCurrency || 'GHS'}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          suggestion={dialogSuggestion}
        />
      )}
      {dialogType === 'goal' && (
        <AddGoalDialog
          currency={profile?.preferredCurrency || 'GHS'}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          suggestion={dialogSuggestion}
        />
      )}
    </div>
  );
}
