'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDoc, useFirestore, useUser, useMemoFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddBillDialog } from '@/components/dashboard/add-bill-dialog';
import { BillList } from '@/components/dashboard/bill-list';

export default function BillsPage() {
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
            Bill Tracker
          </h1>
          <p className="text-muted-foreground">
            Never miss a payment. Track all your bills in one place.
          </p>
        </div>
        <AddBillDialog currency={profile?.preferredCurrency || 'USD'}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Bill
          </Button>
        </AddBillDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bills</CardTitle>
          <CardDescription>
            Here are your upcoming and recurring bills.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BillList />
        </CardContent>
      </Card>
    </div>
  );
}
