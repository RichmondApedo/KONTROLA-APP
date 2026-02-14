'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, doc, limit } from 'firebase/firestore';
import type { IncomeSource, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AddIncomeDialog } from '@/components/dashboard/add-income-dialog';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { IncomeChart } from '@/components/dashboard/income-chart';
import { IncomeList } from '@/components/dashboard/income-list';

export default function IncomePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [docLimit, setDocLimit] = useState(20);

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);
  
  const incomeQuery = useMemo(() => 
    user && firestore
      ? query(
          collection(firestore, 'users', user.uid, 'incomeSources'),
          orderBy('date', 'desc'),
          limit(docLimit)
        )
      : null,
    [user, firestore, docLimit]
  );
  
  const { data: incomeSources, isLoading: isIncomeLoading } = useCollection<IncomeSource>(incomeQuery);

  const isLoading = isProfileLoading || isIncomeLoading;
  const currency = profile?.preferredCurrency || 'USD';
  const hasMore = incomeSources && incomeSources.length === docLimit;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Income
          </h1>
          <p className="text-muted-foreground">
            Track and visualize your income sources.
          </p>
        </div>
        <AddIncomeDialog currency={currency} plan={profile?.plan} />
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-3">
            <CardHeader>
                <CardTitle>Income History</CardTitle>
                <CardDescription>A list of your most recent income.</CardDescription>
            </CardHeader>
            <CardContent>
                <IncomeList incomeSources={incomeSources} isLoading={isLoading} />
                {hasMore && (
                  <div className="mt-6 text-center">
                      <Button onClick={() => setDocLimit(prev => prev + 20)} variant="outline">
                          Load More
                      </Button>
                  </div>
                )}
            </CardContent>
        </Card>
        <div className="md:col-span-2">
            <IncomeChart currency={currency} incomeSources={incomeSources} isLoading={isLoading}/>
        </div>
      </div>
    </div>
  );
}
