'use client';

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { generateFinancialInsights, type FinancialInsightsInput, type FinancialInsightsOutput } from '@/ai/flows/personalized-financial-insights';
import {
  Bot,
  Loader2,
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
import { serverTimestamp, collection, query, where, orderBy, Timestamp, limit } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';

// Safe dynamic import for Markdown to prevent hydration/ESM crashes
const Markdown = dynamic(() => import('react-markdown'), { 
    ssr: false,
    loading: () => <span className="animate-pulse">Loading analysis...</span>
});

/**
 * Robustly formats any date-like value (Firestore Timestamp, JS Date, ISO string).
 * Prevents "Invalid Date" crashes that often cause Application Errors.
 */
function safeFormatDate(d: any): string {
    if (!d) return '';
    try {
        const dateObj = d.toDate ? d.toDate() : new Date(d);
        if (isNaN(dateObj.getTime())) return '';
        return format(dateObj, 'PPP');
    } catch {
        return '';
    }
}

export function InsightsGenerator() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile, isProfileLoading } = useUserProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'budget' | 'goal' | null>(null);
  const [dialogSuggestion, setDialogSuggestion] = useState<any>(null);
  const [followUpInput, setFollowUpInput] = useState('');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const thisMonthStart = startOfMonth(new Date());
  const monthKey = format(thisMonthStart, 'yyyy-MM');

  const historyQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/advisorHistory`),
      where('monthKey', '==', monthKey),
      orderBy('timestamp', 'asc'),
      limit(20)
    );
  }, [user, firestore, monthKey]);

  const incomeQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/income`),
      where('date', '>=', Timestamp.fromDate(thisMonthStart)),
      orderBy('date', 'desc')
    );
  }, [user, firestore, thisMonthStart]);

  const expensesQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/expenses`),
      where('date', '>=', Timestamp.fromDate(thisMonthStart)),
      orderBy('date', 'desc')
    );
  }, [user, firestore, thisMonthStart]);

  const budgetsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/budgets`));
  }, [user, firestore]);

  const savingsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/savingsGoals`));
  }, [user, firestore]);

  const { data: history, error: historyError } = useCollection<any>(historyQuery, `users/${user.uid}/advisorHistory`);
  const { data: income, error: incomeError } = useCollection<IncomeSource>(incomeQuery, `users/${user.uid}/income`);
  const { data: expenses, error: expensesError } = useCollection<Expense>(expensesQuery, `users/${user.uid}/expenses`);
  const { data: budgets } = useCollection<Budget>(budgetsQuery, `users/${user.uid}/budgets`);
  const { data: savingsGoals } = useCollection<SavingsGoal>(savingsQuery, `users/${user.uid}/savingsGoals`);

  const currentInsights = useMemo(() => {
    const lastAssistantMsg = (history || []).find((m: any) => m.role === 'assistant' && m.insights);
    return lastAssistantMsg?.insights || null;
  }, [history]);

  const hasAIAccess = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || (profile?.role as string) === 'admin';
  
  // Critical for AI generation: we need user profile AND at least income/expenses shouldn't be failing.
  // We allow budgets/savings to fail without blocking the generation.
  const isCriticalDataLoaded = !isProfileLoading && !incomeError && !expensesError;
  const canGenerate = hasAIAccess && isCriticalDataLoaded && !historyError;

  if (historyError) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6 text-center space-y-2">
            <h3 className="font-bold text-destructive">Advisor Intelligence Limited</h3>
            <p className="text-xs text-muted-foreground">
                We encountered a permission error while loading your advisor history. 
                Please ensure you have an active session or contact support.
            </p>
        </CardContent>
      </Card>
    );
  }

  const handleGenerate = async (question?: string) => {
    if (!canGenerate || !user || !firestore) return;

    setIsLoading(true);
    setError(null);

    const inputData: FinancialInsightsInput = {
      profile: { firstName: profile?.firstName || 'User', plan: profile?.plan || 'free', preferredCurrency: profile?.preferredCurrency || 'GHS' },
      income: (income || []).map(i => ({ amount: i?.amount || 0, category: i?.category || 'Other', name: i?.name || 'Income', date: safeFormatDate(i?.date), context: i?.context })),
      expenses: (expenses || []).map(e => ({ amount: e?.amount || 0, category: e?.category || 'Other', description: e?.description || 'Expense', date: safeFormatDate(e?.date), context: e?.context })),
      budgets: (budgets || []).map(b => ({ name: b?.name || 'Budget', amount: b?.amount || 0, period: b?.period || 'monthly', category: b?.category || 'Overall' })),
      savingsGoals: (savingsGoals || []).map(g => ({ name: g?.name || 'Goal', currentAmount: g?.currentAmount || 0, targetAmount: g?.targetAmount || 0 })),
      question: question,
      history: (history || []).slice(0, 10).reverse().map(m => ({ role: m?.role === 'assistant' ? 'model' : 'user', content: m?.content || '' })) as any
    };

    try {
      if (question) {
        addDocumentNonBlocking(collection(firestore, `users/${user.uid}/advisorHistory`), {
          role: 'user',
          content: question,
          monthKey,
          timestamp: serverTimestamp()
        });
      }

      const insights = await generateFinancialInsights(inputData);
      
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/advisorHistory`), {
        role: 'assistant',
        content: insights.overallSummary,
        insights: insights,
        monthKey,
        timestamp: serverTimestamp()
      });

      if (question) setFollowUpInput('');
    } catch (err: any) {
      console.error('Advisor Error:', err);
      setError(err.message || 'Failed to generate insights. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: any) => {
    if (action.type === 'budget') {
      setDialogType('budget');
      setDialogSuggestion(action.suggestion);
      setDialogOpen(true);
    } else if (action.type === 'goal') {
      setDialogType('goal');
      setDialogSuggestion(action.suggestion);
      setDialogOpen(true);
    }
  };

  const InsightsDisplay = ({ insights, onActionClick }: { insights: FinancialInsightsOutput, onActionClick: (a: any) => void }) => {
    if (!insights) return null;
    
    return (
        <div className="space-y-8">
            <Card className="border-primary/20 bg-primary/5 shadow-lg overflow-hidden">
                <CardHeader className="bg-primary/10 border-b border-primary/10">
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        Monthly Financial Summary
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown>{insights.overallSummary || ''}</Markdown>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <TrendingUp /> Key Observations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(insights?.keyObservations || []).map((obs: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-muted group hover:border-primary/30 transition-colors">
                                <div className={cn(
                                    "mt-1 p-1 rounded",
                                    obs.severity === 'warning' ? "bg-red-500/20 text-red-500" : 
                                    obs.severity === 'positive' ? "bg-green-500/20 text-green-500" : "bg-primary/20 text-primary"
                                )}>
                                    <Bot className="h-3 w-3" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium">{obs.title}</p>
                                    <p className="text-xs text-muted-foreground">{obs.description}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                         <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Sparkles /> Recommendation
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <p className="text-sm text-muted-foreground">{insights?.businessInsights?.recommendation || 'No specific recommendation available.'}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
  };

  if (!hasMounted) {
    return <div className="p-10 flex items-center justify-center animate-pulse"><Bot className="h-12 w-12 text-primary/30" /></div>;
  }

  return (
    <div className="space-y-6 relative pb-20">
       <div className="absolute inset-0 z-0 pointer-events-none opacity-10 mix-blend-overlay" style={{ backgroundImage: 'url("/images/premium-bg.png")', backgroundSize: 'cover', filter: 'blur(40px)', borderRadius: '1rem'}} />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <Button onClick={() => handleGenerate()} disabled={!canGenerate || isLoading || !hasAIAccess} size="lg" className="shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
            {isLoading && !followUpInput ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFollowUpInput(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleGenerate(followUpInput)}
                        disabled={isLoading || !hasAIAccess}
                        className="bg-background/50 border-primary/20"
                    />
                    <Button 
                        size="icon" 
                        onClick={() => handleGenerate(followUpInput)} 
                        disabled={!followUpInput || isLoading || !hasAIAccess}
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
      )}

      {dialogType === 'budget' && profile && <AddBudgetDialog currency={profile.preferredCurrency || 'GHS'} open={dialogOpen} onOpenChange={setDialogOpen} suggestion={dialogSuggestion} />}
      {dialogType === 'goal' && profile && <AddGoalDialog currency={profile.preferredCurrency || 'GHS'} open={dialogOpen} onOpenChange={setDialogOpen} suggestion={dialogSuggestion} />}
    </div>
  );
}
