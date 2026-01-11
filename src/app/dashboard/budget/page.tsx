'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AddBudgetDialog } from '@/components/dashboard/add-budget-dialog';
import { BudgetList } from '@/components/dashboard/budget-list';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function BudgetPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const profileDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Budgets
          </h1>
          <p className="text-muted-foreground">
            Create and track your financial budgets to stay on target.
          </p>
        </div>
        <AddBudgetDialog />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Budgets</CardTitle>
              <CardDescription>
                Here are your active budgets for various periods.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetList />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="text-yellow-500" />
                        Reward Points
                    </CardTitle>
                    <CardDescription>Earn points by sticking to your budget!</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    {isProfileLoading ? (
                        <Skeleton className="h-12 w-24 mx-auto" />
                    ) : (
                        <div className="text-5xl font-bold text-primary">{profile?.points || 0}</div>
                    )}
                    <p className="text-muted-foreground mt-1">Points</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
