'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { PlusCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { UpgradePlanDialog } from '@/components/dashboard/upgrade-plan-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AddCustomerDialog } from '@/components/dashboard/add-customer-dialog';
import { CustomerList } from '@/components/dashboard/customer-list';

export default function CustomersPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);
  const specialUser = user?.email === 'richmondapedo549@gmail.com' || user?.email === 'richmondapedo549@mail.com';
  const isProPlus = (profile?.plan === 'pro-plus') || specialUser;

  if (isProfileLoading) {
     return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-10 w-32" />
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-4 w-2/4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!isProPlus) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
        <Users className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Upgrade to Pro Plus to Manage Customers</h2>
        <p className="max-w-md text-muted-foreground">
          Our Customer Relationship Management (CRM) tool is an exclusive Pro Plus feature. Upgrade your plan to start managing your customer data.
        </p>
        <UpgradePlanDialog featureName="Customer Management">
          <Button>Upgrade to Pro Plus</Button>
        </UpgradePlanDialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Customers
          </h1>
          <p className="text-muted-foreground">
            Manage your customer database.
          </p>
        </div>
        <AddCustomerDialog>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
            </Button>
        </AddCustomerDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Customer List</CardTitle>
          <CardDescription>
            Here is a list of all your customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <CustomerList />
        </CardContent>
      </Card>
    </div>
  );
}
