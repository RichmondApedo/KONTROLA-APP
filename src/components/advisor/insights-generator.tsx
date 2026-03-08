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
import { collection, query } from 'firebase/firestore';
import type { IncomeSource, Expense, SavingsGoal, Budget } from '@/lib/types';
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
            {insights.actionableRecommendations.map((rec, index) => (
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
          {insights.keyObservations.map((obs, index) => (
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
  const firestore = useFirestore();
  const { profile, isProfileLoading } = useUserProfile();

  const [insights, setInsights] = useState<FinancialInsightsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [dialogAction, setDialogAction] = useState<any>(null);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);

  const incomeQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/incomeSources`)) : null, [user, firestore]);
  const expensesQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/expenses`)) : null, [user, firestore]);
  const savingsGoalsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/savingsGoals`)) : null, [user, firestore]);
  const budgetsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/budgets`)) : null, [user, firestore]);

  const { data: incomeSources, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
  const { data: savingsGoals, isLoading: goalsLoading } = useCollection<SavingsGoal>(savingsGoalsQuery);
  const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);
  
  const canGenerate = !isProfileLoading && !incomeLoading && !expensesLoading && !goalsLoading && !budgetsLoading;
  
  const handleActionClick = (action: any) => {
    setDialogAction(action);
    if (action.type === 'CREATE_BUDGET') {
        setIsBudgetDialogOpen(true);
    } else if (action.type === 'CREATE_SAVINGS_GOAL') {
        setIsGoalDialogOpen(true);
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate || !profile || !incomeSources || !expenses || !savingsGoals || !budgets) {
        setError('Cannot generate insights. Please make sure you have some income and expense data.');
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
      const plainBudgets = JSON.parse(JSON.stringify(budgets));

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
              budgets: plainBudgets,
          },
      };

      if (profile.plan === 'pro-plus' && (businessIncome.length > 0 || businessExpenses.length > 0)) {
          input.businessData = {
              incomeSources: businessIncome,
              expenses: businessExpenses,
              savingsGoals: [],
              budgets: [],
          };
      }

      const result = await getPersonalizedFinancialInsights(input);
      setInsights(result);
    } catch (e: any) {
      console.error("Error generating financial insights:", e);
      setError("The AI Advisor is currently unavailable due to a configuration issue. Our team has been notified.");
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

      {insights && <InsightsDisplay insights={insights} onActionClick={handleActionClick} />}
      
      <AddBudgetDialog
          open={isBudgetDialogOpen}
          onOpenChange={setIsBudgetDialogOpen}
          currency={profile?.preferredCurrency || 'USD'}
          suggestion={dialogAction?.type === 'CREATE_BUDGET' ? dialogAction : undefined}
      />
      <AddGoalDialog
          open={isGoalDialogOpen}
          onOpenChange={setIsGoalDialogOpen}
          currency={profile?.preferredCurrency || 'USD'}
          suggestion={dialogAction?.type === 'CREATE_SAVINGS_GOAL' ? dialogAction : undefined}
      />
    </div>
  );
}
