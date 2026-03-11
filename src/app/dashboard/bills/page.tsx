'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useFirestore,
  useFirebaseApp,
  useUser,
  useUserProfile,
} from '@/firebase';
import { PlusCircle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddBillDialog } from '@/components/dashboard/add-bill-dialog';
import { BillList } from '@/components/dashboard/bill-list';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getMessagingToken, onMessage } from '@/firebase/messaging';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { UpgradePlanDialog } from '@/components/dashboard/upgrade-plan-dialog';
import type { Unsubscribe } from 'firebase/messaging';
import { doc } from 'firebase/firestore';

export default function BillsPage() {
  const { user } = useUser();
  const { profile, isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  const upgradeDialogTriggerRef = useRef<HTMLButtonElement>(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    profile?.notificationsEnabled || false
  );

  useEffect(() => {
    if (profile) {
      setNotificationsEnabled(profile.notificationsEnabled || false);
    }
  }, [profile]);

  useEffect(() => {
    if (firebaseApp) {
      let unsubscribe: Unsubscribe | null = null;
      
      const setupOnMessage = async () => {
        try {
          unsubscribe = await onMessage(firebaseApp, payload => {
            console.log('Foreground message received.', payload);
            toast({
              title: payload.notification?.title,
              description: payload.notification?.body,
            });
          });
        } catch (error) {
            console.error('Failed to setup message listener:', error);
        }
      };

      setupOnMessage();

      // Cleanup subscription on component unmount
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, [firebaseApp, toast]);
  
  const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || isAdmin;
  const profileDocRef = useMemo(() => {
    if (profile && firestore) {
      return doc(firestore, `users/${profile.id}/profile/${profile.id}`);
    }
    return null;
  }, [profile, firestore]);


  const handleNotificationToggle = async (enabled: boolean) => {
    if (!user || !profileDocRef || !firebaseApp) return;

    if (enabled && !isPremium) {
        upgradeDialogTriggerRef.current?.click();
        return;
    }

    setNotificationsEnabled(enabled); // Optimistic update
    try {
      if (enabled) {
        // Request permission and get token
        const token = await getMessagingToken(firebaseApp);
        if (token) {
          setDocumentNonBlocking(
            profileDocRef,
            { fcmToken: token, notificationsEnabled: true },
            { merge: true }
          );
          toast({
            title: 'Notifications Enabled',
            description: 'You will now receive bill reminders.',
          });
        } else {
          // Permission denied
          setNotificationsEnabled(false); // Revert optimistic update
          toast({
            variant: 'destructive',
            title: 'Permission Denied',
            description:
              'You need to allow notifications in your browser settings.',
          });
        }
      } else {
        // Disable notifications
        setDocumentNonBlocking(
          profileDocRef,
          { notificationsEnabled: false },
          { merge: true }
        );
        toast({ title: 'Notifications Disabled' });
      }
    } catch (error: any) {
      console.error('Error handling notifications:', error);
      setNotificationsEnabled(!enabled); // Revert optimistic update
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
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
          <CardTitle>Bill Settings</CardTitle>
          <CardDescription>Manage your bill preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <Bell /> Bill Reminders
              </div>
              <p className="text-sm text-muted-foreground">
                Receive push notifications for upcoming bills. (Premium)
              </p>
            </div>
            <Switch
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationToggle}
                disabled={isProfileLoading}
                aria-label="Toggle bill reminders"
              />
          </div>
        </CardContent>
      </Card>


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
      
      <UpgradePlanDialog featureName="Bill Reminders">
        <button ref={upgradeDialogTriggerRef} className="hidden" />
      </UpgradePlanDialog>
    </div>
  );
}