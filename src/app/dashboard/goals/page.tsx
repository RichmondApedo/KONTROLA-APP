'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useUserProfile } from '@/firebase';
import { PlusCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

const AddGoalDialog = dynamic(() => import('@/components/dashboard/add-goal-dialog').then(mod => mod.AddGoalDialog));
const UpgradePlanDialog = dynamic(() => import('@/components/dashboard/upgrade-plan-dialog').then(mod => mod.UpgradePlanDialog));
const SavingsChallengeList = dynamic(() => import('@/components/dashboard/savings-challenge-list').then(mod => mod.SavingsChallengeList), {
  loading: () => <Skeleton className="h-64 w-full" />,
});
const GoalList = dynamic(
  () => import('@/components/dashboard/goal-list').then((mod) => mod.GoalList),
  {
    loading: () => <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>,
    ssr: false,
  }
);

export default function GoalsPage() {
  const { user } = useUser();
  const { profile, activeProfileId } = useUserProfile();

  const isDelegate = activeProfileId && user && activeProfileId !== user.uid;
  
  const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || isAdmin;
  const currency = profile?.preferredCurrency || 'ghs';

  if (isDelegate) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="h-24 w-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center shadow-inner border border-emerald-500/20">
                <Lock className="h-12 w-12 text-emerald-500" />
            </div>
            <div className="space-y-2">
                <h1 className="text-3xl font-black font-headline tracking-tight text-primary">Privacy Shield Active</h1>
                <p className="text-muted-foreground font-medium max-w-md mx-auto">
                    You are currently in a delegated business session. Personal milestones and savings ambitions are restricted to the account owner.
                </p>
            </div>
            <Button asChild variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-[10px] border-primary/20 bg-primary/5 hover:bg-primary/10">
                <Link href="/dashboard/business">Return to Business Suite</Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    {/* --- EXPERT HEADER SECTION --- */}
    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pt-4 pb-8 border-b border-border/10 relative min-h-[160px] xl:min-h-[140px]">
        <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Capital Goals Active</span>
            </div>
            <h1 className="text-[clamp(1.75rem,7vw,4.5rem)] font-black font-headline tracking-tighter text-foreground leading-[0.85] sm:leading-[0.9]">
                Ambitions
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-bold uppercase tracking-widest opacity-60">
                Achieve your future • <span className="text-primary">Capital Milestones</span>
            </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center flex-wrap xl:flex-nowrap gap-4 lg:gap-6 min-w-0">
            {isPremium ? (
              <AddGoalDialog currency={currency}>
                <Button className="w-full sm:w-auto shadow-lg shadow-primary/20 h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Ambition
                </Button>
              </AddGoalDialog>
            ) : (
                <UpgradePlanDialog featureName="Savings Goals">
                    <Button className="w-full sm:w-auto shadow-lg shadow-primary/20 h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                        <PlusCircle className="mr-2 h-4 w-4" /> Create Ambition
                    </Button>
                </UpgradePlanDialog>
            )}
        </div>
    </div>

      <Tabs defaultValue="my-goals" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] glass-card p-1 shadow-soft">
          <TabsTrigger value="my-goals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs uppercase tracking-widest">My Ambitions</TabsTrigger>
          <TabsTrigger value="save-go" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs uppercase tracking-widest">Save Go</TabsTrigger>
        </TabsList>
        <TabsContent value="my-goals" className="mt-8">
            <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Capital Accumulation Pipeline</CardTitle>
                    <CardDescription className="text-xs uppercase tracking-tight opacity-70">
                        Real-time trajectory towards your financial milestones
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    <GoalList currency={currency} />
                    {!isPremium && (
                      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-left">
                          <p className="text-xs font-black uppercase tracking-widest text-primary">Free Mode Active</p>
                          <p className="text-[10px] text-muted-foreground font-medium">You can view your existing goals. Upgrade to add more.</p>
                        </div>
                        <UpgradePlanDialog featureName="Savings Goals">
                          <Button size="sm" variant="outline" className="text-[9px] font-black uppercase tracking-widest h-8 border-primary/20 hover:bg-primary/10">Authorize Upgrade</Button>
                        </UpgradePlanDialog>
                      </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="save-go" className="mt-8">
            <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Behavioral Savings Engine</CardTitle>
                    <CardDescription className="text-xs uppercase tracking-tight opacity-70">
                        Join elite challenges to accelerate your capital reserves
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    <SavingsChallengeList currency={currency} />
                    {!isPremium && (
                      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-left">
                          <p className="text-xs font-black uppercase tracking-widest text-primary">Free Mode Active</p>
                          <p className="text-[10px] text-muted-foreground font-medium">You can view active challenges. Upgrade to join new ones.</p>
                        </div>
                        <UpgradePlanDialog featureName="Savings Challenges">
                          <Button size="sm" variant="outline" className="text-[9px] font-black uppercase tracking-widest h-8 border-primary/20 hover:bg-primary/10">Authorize Upgrade</Button>
                        </UpgradePlanDialog>
                      </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
