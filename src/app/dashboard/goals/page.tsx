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
import { useDoc, useFirestore, useUser, useMemoFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GoalsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const profileDocRef = useMemoFirestore(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile } = useDoc<UserProfile>(profileDocRef);

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
        <AddGoalDialog currency={profile?.preferredCurrency || 'USD'}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Goal
          </Button>
        </AddGoalDialog>
      </div>

        <Card>
            <CardHeader>
              <CardTitle>Your Goals</CardTitle>
              <CardDescription>
                Track your progress towards your savings goals.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <GoalList currency={profile?.preferredCurrency || 'USD'} />
            </CardContent>
        </Card>
    </div>
  );
}
