'use client';

import { useDoc, useFirestore, useUser, useMemoFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { UpgradePlanDialog } from '@/components/dashboard/upgrade-plan-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, BarChart3, Briefcase } from 'lucide-react';

function ProPlusAdminFeatures() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users />
            Multi-Account Management
          </CardTitle>
          <CardDescription>
            Manage personal and business accounts from a single dashboard. Link
            accounts, view consolidated reports, and manage permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
            <p className="font-medium">Personal Account</p>
            <Button variant="outline">Manage</Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
            <div className="flex items-center gap-2">
              <Briefcase className="text-muted-foreground" />
              <p className="font-medium">Business Account</p>
            </div>
            <Button variant="outline">Manage</Button>
          </div>
          <Button>Link New Account</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 />
            Advanced Forecasts
          </CardTitle>
          <CardDescription>
            Utilize AI-powered forecasting to project your financial health,
            model different scenarios, and get proactive advice on your financial
            strategy.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
          <p className="text-muted-foreground">
            Forecasting models and charts will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const profileDocRef = useMemoFirestore(
    () =>
      user && firestore
        ? doc(firestore, `users/${user.uid}/profile`, user.uid)
        : null,
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(profileDocRef);
  const isProPlus = profile?.plan === 'pro-plus';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Pro+ Admin Panel
        </h1>
        <p className="text-muted-foreground">
          Exclusive features for our Pro Plus members.
        </p>
      </div>

      {isProfileLoading && (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!isProfileLoading &&
        (isProPlus ? (
          <ProPlusAdminFeatures />
        ) : (
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Upgrade to Pro Plus</CardTitle>
              <CardDescription>
                These professional-grade features are exclusively available to
                our Pro Plus subscribers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UpgradePlanDialog featureName="Pro+ Admin Tools">
                <Button size="lg">Upgrade Your Plan</Button>
              </UpgradePlanDialog>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
