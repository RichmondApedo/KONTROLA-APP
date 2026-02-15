'use client';

import { useDoc, useFirestore, useUser } from '@/firebase';
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
import Link from 'next/link';
import { useMemo } from 'react';
import { AdvancedForecasts } from '@/components/dashboard/advanced-forecasts';

function ProPlusAdminFeatures({ isProPlus }: { isProPlus: boolean }) {
  const businessManageButton = isProPlus ? (
    <Button variant="outline" asChild>
      <Link href="/dashboard/business">Manage</Link>
    </Button>
  ) : (
    <UpgradePlanDialog featureName="Business Account Management">
      <Button variant="outline" className="w-full sm:w-auto">
        Manage
      </Button>
    </UpgradePlanDialog>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users />
            Account Management
          </CardTitle>
          <CardDescription>
            Manage personal and business accounts, add multiple accounts, view consolidated reports, and manage permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-secondary rounded-lg gap-2">
            <p className="font-medium">Personal Account</p>
            <Button variant="outline" asChild>
              <Link href="/dashboard/settings">Manage</Link>
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-secondary rounded-lg gap-2">
            <div className="flex items-center gap-2">
              <Briefcase className="text-muted-foreground" />
              <p className="font-medium">Business Account</p>
            </div>
            {businessManageButton}
          </div>
        </CardContent>
      </Card>
      {isProPlus ? (
        <AdvancedForecasts />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 />
              Advanced Forecasts
            </CardTitle>
            <CardDescription>
              Utilize AI-powered forecasting to project your financial health,
              model different scenarios, and get proactive advice on your
              financial strategy.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
            <p className="text-center text-muted-foreground">
              Forecasting models and charts will be displayed here.
            </p>
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center flex-col gap-2 p-4">
              <p className="text-center font-semibold text-foreground">
                This is a Pro Plus feature.
              </p>
              <UpgradePlanDialog featureName="Advanced Forecasts">
                <Button>Upgrade to Unlock</Button>
              </UpgradePlanDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const profileDocRef = useMemo(
    () =>
      user && firestore
        ? doc(firestore, `users/${user.uid}/profile`, user.uid)
        : null,
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(profileDocRef);

  const isProPlus = profile?.plan === 'pro-plus' || user?.email === 'richmondapedo549@gmail.com';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Admin Panel
        </h1>
        <p className="text-muted-foreground">
          Oversee accounts, access Pro features, and manage business settings.
        </p>
      </div>

      {isProfileLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <ProPlusAdminFeatures isProPlus={isProPlus} />
      )}
    </div>
  );
}
