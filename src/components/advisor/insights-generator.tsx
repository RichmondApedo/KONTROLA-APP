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
import { startOfMonth, endOfMonth, format } from 'date-fns';
import type { IncomeSource, Expense, Budget, SavingsGoal } from '@/lib/types';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Progress } from '../ui/progress';
import { AddBudgetDialog } from '../dashboard/add-budget-dialog';
import { AddGoalDialog } from '../dashboard/add-goal-dialog';
import { Input } from '@/components/ui/input';
import { Send, History } from 'lucide-react';
import Markdown from 'react-markdown';
import { serverTimestamp, collection, query, where, orderBy, Timestamp, limit } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface AdvisorMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    insights?: FinancialInsightsOutput;
    timestamp?: any;
}

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

      {insights.followUpAnswer && (
        <Alert className="border-green-500/50 bg-green-500/5">
            <Sparkles className="h-5 w-5 text-green-500" />
            <AlertTitle className="font-semibold text-green-500">Follow-up Answer</AlertTitle>
            <AlertDescription className="prose prose-sm dark:prose-invert max-w-none">
                <Markdown>{insights.followUpAnswer}</Markdown>
            </AlertDescription>
        </Alert>
      )}

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
        <h3 className="text-xl font-bold font-headline mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Actionable Recommendations
        </h3>
         <div className="space-y-4">
            {insights.actionableRecommendations.map((rec: any, index: number) => (
                <Card key={index} className="shadow-md hover:shadow-lg transition-shadow border-primary/10">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="p-2 bg-primary/10 rounded-full">
                                <Lightbulb className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-lg font-bold">{rec.title}</CardTitle>
                        </div>
                        <CardDescription className="text-sm leading-relaxed">{rec.description}</CardDescription>
                    </CardHeader>
                    {rec.action.type !== 'INFO_ONLY' && (
                        <CardFooter className="pt-0">
                            <Button onClick={() => onActionClick(rec.action)} className="w-full sm:w-auto">
                                <span>{rec.action.type === 'CREATE_BUDGET' ? 'Create This Budget' : 'Set This Goal'}</span>
                                <ChevronRight className="ml-2 h-4 w-4" />
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
  const { profile, isProfileLoading } = useUserProfile();
  const firestore = useFirestore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUpInput, setFollowUpInput] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'budget' | 'goal' | null>(null);
  const [dialogSuggestion, setDialogSuggestion] = useState<any>(null);

  // Per-month isolation
  const monthKey = useMemo(() => format(new Date(), 'yyyy-MM'), []);
  const chatColPath = useMemo(() => user ? `users/${user.uid}/chats/advisor/${monthKey}/messages` : null, [user, monthKey]);

  const historyQuery = useMemo(() => chatColPath && firestore ? query(
      collection(firestore, chatColPath),
      orderBy('timestamp', 'desc'),
      limit(20)
  ) : null, [firestore, chatColPath]);

  const { data: history, isLoading: isHistoryLoading } = useCollection<AdvisorMessage>(historyQuery);

  const currentInsights = useMemo(() => {
    const lastAssistantMsg = history?.find(m => m.role === 'assistant' && m.insights);
    return lastAssistantMsg?.insights || null;
  }, [history]);

  // Data fetching for generation
  const thisMonthStart = useMemo(() => startOfMonth(new Date()), []);
  const thisMonthEnd = useMemo(() => endOfMonth(new Date()), []);

  const incomeQuery = useMemo(() => user && firestore ? query(
    collection(firestore, `users/${user.uid}/incomeSources`),
    where('date', '>=', Timestamp.fromDate(thisMonthStart)),
    where('date', '<=', Timestamp.fromDate(thisMonthEnd))
  ) : null, [user, firestore, thisMonthStart, thisMonthEnd]);

  const expensesQuery = useMemo(() => user && firestore ? query(
    collection(firestore, `users/${user.uid}/expenses`),
    where('date', '>=', Timestamp.fromDate(thisMonthStart)),
    where('date', '<=', Timestamp.fromDate(thisMonthEnd))
  ) : null, [user, firestore, thisMonthStart, thisMonthEnd]);
  
  const budgetsQuery = useMemo(() => user && firestore ? query(
      collection(firestore, `users/${user.uid}/budgets`),
      where('endDate', '>=', Timestamp.now())
  ) : null, [user, firestore]);

  const savingsGoalsQuery = useMemo(() => user && firestore ? query(
      collection(firestore, `users/${user.uid}/savingsGoals`)
  ) : null, [user, firestore]);

  const { data: income, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);
  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
  const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);
  const { data: savingsGoals, isLoading: goalsLoading } = useCollection<SavingsGoal>(savingsGoalsQuery);

  const canGenerate = !incomeLoading && !expensesLoading && !budgetsLoading && !goalsLoading && !isHistoryLoading;
  const hasAIAccess = profile?.plan === 'premium' || profile?.plan === 'pro-plus';
  
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

  const handleGenerate = async (question?: string) => {
    if (!profile || !income || !expenses || !budgets || !savingsGoals || !canGenerate || !chatColPath) {
      if (!isHistoryLoading && !income?.length) setError("Add some financial data for this month first!");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    const inputData: FinancialInsightsInput = {
      profile: { firstName: profile.firstName || 'User', plan: profile.plan, preferredCurrency: profile.preferredCurrency },
      income: income.map(i => ({ amount: i.amount || 0, category: i.category || 'Other', name: i.name, date: i.date ? format(new Date((i.date as any).toDate?.() || i.date), 'PPP') : '', context: i.context })),
      expenses: expenses.map(e => ({ amount: e.amount || 0, category: e.category || 'Other', description: e.description, date: e.date ? format(new Date((e.date as any).toDate?.() || e.date), 'PPP') : '', context: e.context })),
      budgets: budgets.map(b => ({ name: b.name, amount: b.amount || 0, period: b.period || 'monthly', category: b.category || 'Overall' })),
      savingsGoals: savingsGoals.map(g => ({ name: g.name, currentAmount: g.currentAmount || 0, targetAmount: g.targetAmount || 0 })),
      question: question,
      history: history?.slice(0, 10).reverse().map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', content: m.content })) as any
    };

    try {
      if (question) {
          addDocumentNonBlocking(collection(firestore!, chatColPath), { role: 'user', content: question, timestamp: serverTimestamp() });
          setFollowUpInput('');
      }

      const result = await getPersonalizedFinancialInsights(inputData);
      
      addDocumentNonBlocking(collection(firestore!, chatColPath), {
          role: 'assistant',
          content: result.followUpAnswer || result.overallSummary,
          insights: result,
          timestamp: serverTimestamp()
      });

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Advisor intelligence is offline. Try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative pb-20">
       <div className="absolute inset-0 z-0 pointer-events-none opacity-10 mix-blend-overlay" style={{ backgroundImage: 'url("/images/premium-bg.png")', backgroundSize: 'cover', filter: 'blur(40px)', borderRadius: '1rem'}} />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <Button onClick={() => handleGenerate()} disabled={!canGenerate || isLoading || !hasAIAccess} size="lg" className="shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
            {isLoading && !followUpInput ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isLoading && !followUpInput ? 'Analysing...' : (currentInsights ? 'Refresh Insights' : 'Generate Financial Insights')}
          </Button>
          
          {history && history.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-primary/10">
                <History className="h-3 w-3" />
                <span>Memory Active: {monthKey}</span>
              </div>
          )}
      </div>

      {!hasAIAccess && !isProfileLoading && (
        <Alert className="border-primary/50 bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertTitle>Premium Feature</AlertTitle>
          <AlertDescription>Upgrade to Premium or Pro Plus to unlock your AI Financial Advisor.</AlertDescription>
        </Alert>
      )}

      {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      {isLoading && !followUpInput && (
        <Card className="border-primary/20 bg-primary/5 animate-pulse">
            <CardContent className="p-10 flex flex-col items-center justify-center space-y-4">
                <Bot className="h-12 w-12 text-primary" />
                <p className="text-primary font-medium">KONTROLA is crunching your numbers...</p>
            </CardContent>
        </Card>
      )}

      {currentInsights && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <InsightsDisplay insights={currentInsights} onActionClick={handleActionClick} />
            
            <div className="mt-12 pt-8 border-t border-primary/10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold">Ask Follow-up Questions</h3>
                </div>
                <div className="flex gap-2">
                    <Input 
                        placeholder="e.g., How can I reduce my dining expenses?" 
                        value={followUpInput}
                        onChange={e => setFollowUpInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleGenerate(followUpInput)}
                        disabled={isLoading || !hasAIAccess}
                        className="bg-background/50 border-primary/20"
                    />
                    <Button 
                        size="icon" 
                        onClick={() => handleGenerate(followUpInput)} 
                        disabled={!followUpInput || isLoading || !hasAIAccess}
                    >
                        {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
      )}

      {dialogType === 'budget' && <AddBudgetDialog currency={profile?.preferredCurrency || 'GHS'} open={dialogOpen} onOpenChange={setDialogOpen} suggestion={dialogSuggestion} />}
      {dialogType === 'goal' && <AddGoalDialog currency={profile?.preferredCurrency || 'GHS'} open={dialogOpen} onOpenChange={setDialogOpen} suggestion={dialogSuggestion} />}
    </div>
  );
}
