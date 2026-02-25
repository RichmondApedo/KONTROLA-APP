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
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { UpgradePlanDialog } from '@/components/dashboard/upgrade-plan-dialog';

export default function BudgetPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile } = useDoc<UserProfile>(profileDocRef);
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus';

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
         {isPremium ? (
          <AddBudgetDialog currency={profile?.preferredCurrency || 'usd'}>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Budget
            </Button>
          </AddBudgetDialog>
        ) : (
          <UpgradePlanDialog featureName="Budgets">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Budget
            </Button>
          </UpgradePlanDialog>
        )}
      </div>

        <Card>
        <CardHeader>
            <CardTitle>Your Budgets</CardTitle>
            <CardDescription>
            Here are your active budgets.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {isPremium ? (
            <BudgetList />
            ) : (
            <div className="text-center text-muted-foreground py-10">
                <p>Upgrade to Premium to create and track budgets.</p>
                <UpgradePlanDialog featureName="Budgets">
                    <Button variant="link" className="p-0 h-auto mt-1">Upgrade</Button>
                </UpgradePlanDialog>
            </div>
            )}
        </CardContent>
        </Card>
    </div>
  );
}
