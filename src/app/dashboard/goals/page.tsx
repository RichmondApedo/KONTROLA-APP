'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AddGoalDialog } from '@/components/dashboard/add-goal-dialog';
import { GoalList } from '@/components/dashboard/goal-list';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UpgradePlanDialog } from '@/components/dashboard/upgrade-plan-dialog';
import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SavingsChallengeList } from '@/components/dashboard/savings-challenge-list';

export default function GoalsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile } = useDoc<UserProfile>(profileDocRef);
  
  const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com' || user?.email === 'richmondapedo549@mail.com';
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || isAdmin;
  const currency = profile?.preferredCurrency || 'USD';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Savings Goals
          </h1>
          <p className="text-muted-foreground">
            Set and track your financial goals to stay motivated.
          </p>
        </div>
        {isPremium ? (
          <AddGoalDialog currency={currency}>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Goal
            </Button>
          </AddGoalDialog>
        ) : (
            <UpgradePlanDialog featureName="Savings Goals">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Goal
                </Button>
            </UpgradePlanDialog>
        )}
      </div>

      <Tabs defaultValue="my-goals" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-goals">My Goals</TabsTrigger>
          <TabsTrigger value="save-go">Save Go</TabsTrigger>
        </TabsList>
        <TabsContent value="my-goals" className="mt-6">
            <Card>
                <CardHeader>
                <CardTitle>Your Goals</CardTitle>
                <CardDescription>
                    Track your progress towards your savings goals.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    {isPremium ? (
                        <GoalList currency={currency} />
                    ): (
                        <div className="text-center text-muted-foreground py-10">
                            <p>Upgrade to Premium to create and track savings goals.</p>
                            <UpgradePlanDialog featureName="Savings Goals">
                                <Button variant="link" className="p-0 h-auto mt-1">Upgrade</Button>
                            </UpgradePlanDialog>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="save-go" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Savings Challenges</CardTitle>
                    <CardDescription>
                        Join a challenge to build your savings habit.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isPremium ? (
                        <SavingsChallengeList currency={currency} />
                    ): (
                        <div className="text-center text-muted-foreground py-10">
                            <p>Savings Challenges are a premium feature. Upgrade to join!</p>
                            <UpgradePlanDialog featureName="Savings Challenges">
                                <Button variant="link" className="p-0 h-auto mt-1">Upgrade</Button>
                            </UpgradePlanDialog>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
