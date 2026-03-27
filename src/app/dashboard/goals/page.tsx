'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useUserProfile } from '@/firebase';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

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
  const { profile } = useUserProfile();
  
  const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro-plus' || isAdmin;
  const currency = profile?.preferredCurrency || 'ghs';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground sm:text-5xl">
            Ambitions
          </h1>
          <p className="text-muted-foreground mt-1 text-lg font-medium">
            Architect and achieve your long-term capital milestones.
          </p>
        </div>
        {isPremium ? (
          <AddGoalDialog currency={currency}>
            <Button className="shadow-lg shadow-primary/20">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Ambition
            </Button>
          </AddGoalDialog>
        ) : (
            <UpgradePlanDialog featureName="Savings Goals">
                <Button className="shadow-lg shadow-primary/20">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Ambition
                </Button>
            </UpgradePlanDialog>
        )}
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
                    {isPremium ? (
                        <GoalList currency={currency} />
                    ): (
                        <div className="text-center text-muted-foreground py-16 glass-card rounded-2xl border border-dashed border-border/60">
                            <p className="text-lg font-bold text-foreground">Premium Ambitions Required</p>
                            <p className="text-sm opacity-70 mt-1">Upgrade to architect complex multi-stage savings containers.</p>
                            <UpgradePlanDialog featureName="Savings Goals">
                                <Button variant="link" className="mt-4 text-primary font-bold uppercase tracking-widest text-xs">Authorize Upgrade</Button>
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
                    {isPremium ? (
                        <SavingsChallengeList currency={currency} />
                    ): (
                        <div className="text-center text-muted-foreground py-16 glass-card rounded-2xl border border-dashed border-border/60">
                            <p className="text-lg font-bold text-foreground">Challenges Locked</p>
                            <p className="text-sm opacity-70 mt-1">Upgrade to join the Kontrola Savings Network habit accelerators.</p>
                            <UpgradePlanDialog featureName="Savings Challenges">
                                <Button variant="link" className="mt-4 text-primary font-bold uppercase tracking-widest text-xs">Authorize Upgrade</Button>
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
