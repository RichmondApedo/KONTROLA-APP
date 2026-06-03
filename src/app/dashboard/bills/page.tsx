'use client';
import { checkIsAdmin } from '@/lib/security-config';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useFirebaseApp, useUser, useUserProfile, useFirestore, useCollection } from '@/firebase';
import { PlusCircle, Bell, Briefcase, User as UserIcon, Lock } from 'lucide-react';
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
import Link from 'next/link';

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
  const { profile, isProfileLoading, activeProfileId } = useUserProfile();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  const upgradeDialogTriggerRef = useRef<HTMLButtonElement>(null);

  const isDelegate = activeProfileId && user && activeProfileId !== user.uid;

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    profile?.notificationsEnabled || false
  );

  useEffect(() => {
    if (profile) {
      setNotificationsEnabled(profile.notificationsEnabled || false);
    }
  }, [profile]);

  useEffect(() => {
    if (!isDelegate && firebaseApp) {
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
  }, [firebaseApp, toast, isDelegate]);

  const profileDocRef = useMemo(() => {
    if (!isDelegate && profile && firestore) {
      return doc(firestore, `users/${profile.id}/profile/${profile.id}`);
    }
    return null;
  }, [profile, firestore, isDelegate]);

  const isAdmin = checkIsAdmin(profile, user);
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || isAdmin;

  if (isDelegate) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="h-24 w-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center shadow-inner border border-emerald-500/20">
                <Lock className="h-12 w-12 text-emerald-500" />
            </div>
            <div className="space-y-2">
                <h1 className="text-3xl font-black font-headline tracking-tight text-primary">Privacy Shield Active</h1>
                <p className="text-muted-foreground font-medium max-w-md mx-auto">
                    You are currently in a delegated business session. Personal financial obligations and notification settings are restricted to the account owner.
                </p>
            </div>
            <Button asChild variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-[10px] border-primary/20 bg-primary/5 hover:bg-primary/10">
                <Link href="/dashboard/business">Return to Business Suite</Link>
            </Button>
        </div>
    );
  }


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
    {/* --- EXPERT HEADER SECTION --- */}
    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pt-4 pb-8 border-b border-border/10 relative min-h-[160px] xl:min-h-[140px]">
        <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Liability Tracking Active</span>
            </div>
            <h1 className="text-[clamp(1.75rem,7vw,4.5rem)] font-black font-headline tracking-tighter text-foreground leading-[0.85] sm:leading-[0.9]">
                Obligations
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-bold uppercase tracking-widest opacity-60">
                Precision tracking • <span className="text-primary">Recurring Liabilities</span>
            </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center flex-wrap xl:flex-nowrap gap-4 lg:gap-6 min-w-0">
            <AddBillDialog currency={profile?.preferredCurrency || 'ghs'}>
                <Button className="w-full sm:w-auto shadow-lg shadow-primary/20 h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Obligation
                </Button>
            </AddBillDialog>
        </div>
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


      <div className="grid gap-8 lg:grid-cols-2">
          {/* Business Section */}
          <Card className="glass-card shadow-premium border-border/40 overflow-hidden bg-primary/[0.01]">
            <CardHeader className="pb-2 border-b border-border/10 bg-muted/20">
              <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-primary" />
                 </div>
                 <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Business Obligations</CardTitle>
                    <CardDescription className="text-xs uppercase tracking-tight opacity-70">Liabilities related to your SME operations</CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
                <BillList filterContext="business" />
            </CardContent>
          </Card>

          {/* Personal Section */}
          <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
             <CardHeader className="pb-2 border-b border-border/10 bg-muted/20">
              <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-xl bg-muted-foreground/10 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                 </div>
                 <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Personal Obligations</CardTitle>
                    <CardDescription className="text-xs uppercase tracking-tight opacity-70">Private and household financial metrics</CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
                <BillList filterContext="personal" />
            </CardContent>
          </Card>
      </div>
      
      <UpgradePlanDialog featureName="Bill Reminders">
        <button ref={upgradeDialogTriggerRef} className="hidden" />
      </UpgradePlanDialog>
    </div>
  );
}
