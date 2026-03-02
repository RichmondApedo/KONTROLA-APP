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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarketList } from '@/components/dashboard/market-list';
import { AddMarketListItemDialog } from '@/components/dashboard/add-market-list-item-dialog';

export default function BudgetPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile } = useDoc<UserProfile>(profileDocRef);
  
  const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || isAdmin;
  const currency = profile?.preferredCurrency || 'usd';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Budgets & Planning
        </h1>
        <p className="text-muted-foreground">
          Create budgets to stay on target and plan your market shopping.
        </p>
      </div>

      <Tabs defaultValue="budgets" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="market-list">Market List</TabsTrigger>
        </TabsList>
        <TabsContent value="budgets" className="mt-6">
            <Card>
                <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Your Budgets</CardTitle>
                        <CardDescription>
                        Here are your active budgets.
                        </CardDescription>
                    </div>
                    {isPremium ? (
                      <AddBudgetDialog currency={currency}>
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
        </TabsContent>
        <TabsContent value="market-list" className="mt-6">
            <Card>
                <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Your Market Shopping List</CardTitle>
                        <CardDescription>
                            Plan your shopping and add purchased items to your expenses.
                        </CardDescription>
                    </div>
                    <AddMarketListItemDialog currency={currency}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    </AddMarketListItemDialog>
                </CardHeader>
                <CardContent>
                    <MarketList currency={currency} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
