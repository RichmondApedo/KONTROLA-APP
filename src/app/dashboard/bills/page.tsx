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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getMessagingToken, onMessage } from '@/firebase/messaging';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Unsubscribe } from 'firebase/messaging';
import { doc } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const AddBillDialog = dynamic(() => import('@/components/dashboard/add-bill-dialog').then(mod => mod.AddBillDialog));
const UpgradePlanDialog = dynamic(() => import('@/components/dashboard/upgrade-plan-dialog').then(mod => mod.UpgradePlanDialog));
const BillList = dynamic(() => import('@/components/dashboard/bill-list').then(mod => mod.BillList), {
  loading: () => (
    <div className="space-y-4 md:space-y-2">
      <Skeleton className="h-32 w-full md:h-10" />
      <Skeleton className="h-32 w-full md:h-10" />
      <Skeleton className="h-32 w-full md:h-10" />
    </div>
  ),
  ssr: false,
});

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
          // Differentiate between permission issues and general failures
          const permission = Notification.permission;
          setNotificationsEnabled(false); // Revert optimistic update

          if (permission === 'denied') {
            toast({
              variant: 'destructive',
              title: 'Permission Denied',
              description: 'You need to allow notifications in your browser settings to use this feature.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Notifications Setup Failed',
              description: 'We couldn\'t connect your device to our notification service. Please try again later.',
            });
          }
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground sm:text-5xl">
            Obligations
          </h1>
          <p className="text-muted-foreground mt-1 text-lg font-medium">
            Precision tracking for your recurring liabilities.
          </p>
        </div>
        <AddBillDialog currency={profile?.preferredCurrency || 'USD'}>
            <Button className="shadow-lg shadow-primary/20">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Bill
            </Button>
        </AddBillDialog>
      </div>
      
      <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Notification Architecture</CardTitle>
          <CardDescription className="text-xs uppercase tracking-tight opacity-70">Configure your automated alerting systems</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-muted/30 p-5 shadow-inner">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-bold text-sm flex items-center gap-2">
                  Bill Reminders
                  {isPremium && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black uppercase tracking-tighter">Active</Badge>}
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  Receive real-time push notifications for upcoming maturity dates.
                </p>
              </div>
            </div>
            <Switch
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationToggle}
                disabled={isProfileLoading}
                aria-label="Toggle bill reminders"
                className="data-[state=checked]:bg-primary"
              />
          </div>
        </CardContent>
      </Card>


      <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Upcoming Maturity Dates</CardTitle>
          <CardDescription className="text-xs uppercase tracking-tight opacity-70">
            Current and pending financial obligations
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
