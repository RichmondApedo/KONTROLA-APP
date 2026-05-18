'use client';
import { checkIsAdmin } from '@/lib/security-config';

import { useFirestore, useUser, useUserProfile } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useState } from 'react';

interface SavingsChallengeListProps {
  currency: string;
}

const challenges = [
  { id: 'daily-10', title: 'The 10-a-Day Challenge', amount: 10, period: 'daily' as const, durationText: '30 days' },
  { id: 'daily-20', title: 'The 20-a-Day Challenge', amount: 20, period: 'daily' as const, durationText: '30 days' },
  { id: 'weekly-50', title: 'The Weekly 50', amount: 50, period: 'weekly' as const, durationText: '4 weeks' },
  { id: 'weekly-100', title: 'The Weekly 100', amount: 100, period: 'weekly' as const, durationText: '4 weeks' },
  { id: 'monthly-250', title: 'The Monthly 250', amount: 250, period: 'monthly' as const, durationText: '1 month' },
  { id: 'monthly-500', title: 'The Monthly 500', amount: 500, period: 'monthly' as const, durationText: '1 month' },
];

export function SavingsChallengeList({ currency }: SavingsChallengeListProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile } = useUserProfile();
  const isAdmin = checkIsAdmin(profile, user);
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || isAdmin;
  const { toast } = useToast();
  const [loadingChallenge, setLoadingChallenge] = useState<string | null>(null);

  const calculateTarget = (amount: number, period: 'daily' | 'weekly' | 'monthly') => {
    switch (period) {
      case 'daily': return amount * 30;
      case 'weekly': return amount * 4;
      case 'monthly': return amount;
      default: return amount;
    }
  };

  const handleStartChallenge = async (challenge: typeof challenges[0]) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be signed in to start a challenge.',
      });
      return;
    }

    setLoadingChallenge(challenge.id);

    const targetAmount = calculateTarget(challenge.amount, challenge.period);
    const goalName = `${challenge.title} (${currency.toUpperCase()})`;

    try {
      const goalCollection = collection(firestore, 'users', user.uid, 'savingsGoals');
      await addDocumentNonBlocking(goalCollection, {
        name: goalName,
        targetAmount,
        currentAmount: 0,
        currency,
        userId: user.uid,
        isChallenge: true,
        challengePeriod: challenge.period,
      });

      toast({
        title: 'Challenge Started! 🎉',
        description: `Your new savings goal "${goalName}" has been created.`,
      });
    } catch (error) {
      console.error('Error starting challenge:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not start the challenge. Please try again.',
      });
    } finally {
      setLoadingChallenge(null);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {challenges.map((challenge) => {
        const targetAmount = calculateTarget(challenge.amount, challenge.period);
        return (
          <Card key={challenge.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full w-fit">
                    <Zap className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>{challenge.title}</CardTitle>
              </div>
              <CardDescription>
                Save {formatCurrency(challenge.amount, currency)} {challenge.period} for {challenge.durationText}.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-2">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Goal</p>
                    <p className="text-3xl font-bold">{formatCurrency(targetAmount, currency)}</p>
                </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => handleStartChallenge(challenge)}
                disabled={loadingChallenge === challenge.id || !isPremium}
              >
                {loadingChallenge === challenge.id ? 'Starting...' : !isPremium ? 'Upgrade to Start' : 'Start Challenge'}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
