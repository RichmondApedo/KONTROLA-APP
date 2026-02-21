'use client';

import { useDoc, useFirestore, useUser } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { Award, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RedeemRewardButton } from '@/components/dashboard/redeem-reward-button';
import rewards from '@/lib/rewards-data.json';

export default function RewardsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const profileDocRef = useMemo(
    () => (user ? doc(firestore, `users/${user.uid}/profile/${user.uid}`) : null),
    [user, firestore]
  );
  const { data: profile, isLoading } = useDoc<UserProfile>(profileDocRef);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Rewards Store</h1>
          <p className="text-muted-foreground">
            Spend your points on exclusive rewards to customize your experience.
          </p>
        </div>
        <Card className="w-full sm:w-auto">
          <CardContent className="p-4 flex items-center gap-4">
            <Award className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Your Points</p>
              {isLoading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <p className="text-2xl font-bold">{profile?.points ?? 0}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </>
        ) : (
          rewards.map((reward) => (
            <Card key={reward.id} className="flex flex-col">
              <div className="overflow-hidden rounded-t-lg">
                <img
                  src={reward.imageUrl}
                  alt={reward.title}
                  className="h-40 w-full object-cover"
                  data-ai-hint={reward.imageHint}
                />
              </div>
              <CardHeader>
                <CardTitle>{reward.title}</CardTitle>
                <CardDescription>{reward.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between">
                <div className="text-lg font-bold flex items-center gap-1">
                  <Award className="h-5 w-5 text-yellow-500" />
                  <span>{reward.cost} Points</span>
                </div>
                <RedeemRewardButton reward={reward} profile={profile} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
