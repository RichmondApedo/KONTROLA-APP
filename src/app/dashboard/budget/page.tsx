'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useUserProfile } from '@/firebase';
import { PlusCircle, ShoppingCart, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { usePeriod } from '@/components/period-provider';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { useFeatureDiscovery } from '@/hooks/use-feature-discovery';

const AddBudgetDialog = dynamic(() => import('@/components/dashboard/add-budget-dialog').then(mod => mod.AddBudgetDialog));
const UpgradePlanDialog = dynamic(() => import('@/components/dashboard/upgrade-plan-dialog').then(mod => mod.UpgradePlanDialog));
const MarketList = dynamic(
  () => import('@/components/dashboard/market-list').then((mod) => mod.MarketList),
  {
    loading: () => <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-40 w-full" /></div>,
    ssr: false,
  }
);
const BudgetList = dynamic(
  () => import('@/components/dashboard/budget-list').then((mod) => mod.BudgetList),
  {
    loading: () => <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>,
    ssr: false,
  }
);


export default function BudgetPage() {
  const { user } = useUser();
  const { profile, activeProfileId, activeProfile } = useUserProfile();

  const { personal, business } = usePeriod();
  const isDelegate = activeProfileId && user && activeProfileId !== user.uid;
  const activeTrack = isDelegate ? business : personal;
  const { 
    periodMode, 
    setPeriodMode, 
    label,
    customRange,
    setCustomRange,
    startDate,
    endDate,
  } = activeTrack;

  const { markAsDiscovered } = useFeatureDiscovery('pay_cycle');
  
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
                    You are currently in a delegated business session. Strategic planning and personal budget allocations are restricted to the account owner.
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
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Strategic Planning Active</span>
            </div>
            <h1 className="text-[clamp(1.75rem,7vw,4.5rem)] font-black font-headline tracking-tighter text-foreground leading-[0.85] sm:leading-[0.9]">
                Strategic Planning
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-bold uppercase tracking-widest opacity-60">
                Architect your future • <span className="text-primary">Capital Allocations</span>
            </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center flex-wrap xl:flex-nowrap gap-4 lg:gap-6 min-w-0">
            <PeriodSelector 
              periodMode={periodMode}
              onModeChange={setPeriodMode}
              incomeDate={activeProfile?.incomeDate || profile?.incomeDate}
              label={label}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
              onDiscovered={markAsDiscovered}
            />
            {isPremium ? (
              <AddBudgetDialog currency={currency}>
                <Button className="w-full sm:w-auto shadow-lg shadow-primary/20 h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Budget
                </Button>
              </AddBudgetDialog>
            ) : (
              <UpgradePlanDialog featureName="Budgets">
                <Button className="w-full sm:w-auto shadow-lg shadow-primary/20 h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Budget
                </Button>
              </UpgradePlanDialog>
            )}
        </div>
    </div>

      <Tabs defaultValue="budgets" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] glass-card p-1 shadow-soft">
          <TabsTrigger value="budgets" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs uppercase tracking-widest">Budgets</TabsTrigger>
          <TabsTrigger value="market-list" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs uppercase tracking-widest">Market List</TabsTrigger>
        </TabsList>
        <TabsContent value="budgets" className="mt-8">
            <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-2">
                    <div>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Active Capital Allocations</CardTitle>
                        <CardDescription className="text-xs uppercase tracking-tight opacity-70">
                        Real-time variance tracking for your financial targets
                        </CardDescription>
                    </div>
                    {isPremium ? (
                      <AddBudgetDialog currency={currency}>
                        <Button className="shadow-lg shadow-primary/20">
                          <PlusCircle className="mr-2 h-4 w-4" /> Create Budget
                        </Button>
                      </AddBudgetDialog>
                    ) : (
                      <UpgradePlanDialog featureName="Budgets">
                        <Button className="shadow-lg shadow-primary/20">
                          <PlusCircle className="mr-2 h-4 w-4" /> Create Budget
                        </Button>
                      </UpgradePlanDialog>
                    )}
                </CardHeader>
                <CardContent className="pt-4">
                    {isPremium ? (
                    <BudgetList />
                    ) : (
                    <div className="text-center text-muted-foreground py-16 glass-card rounded-2xl border border-dashed border-border/60">
                        <p className="text-lg font-bold text-foreground">Premium Planning Required</p>
                        <p className="text-sm opacity-70 mt-1">Upgrade to unlock the elite budget architecture system.</p>
                        <UpgradePlanDialog featureName="Budgets">
                            <Button variant="link" className="mt-4 text-primary font-bold uppercase tracking-widest text-xs">Authorize Upgrade</Button>
                        </UpgradePlanDialog>
                    </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="market-list" className="mt-8">
            {isPremium ? (
                <MarketList currency={currency} />
            ) : (
                <Card className="glass-card shadow-premium border-border/40 overflow-hidden text-center py-20 flex flex-col items-center gap-6">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                        <ShoppingCart className="h-10 w-10 text-primary" />
                    </div>
                    <CardContent className="max-w-md">
                        <h3 className="text-2xl font-black tracking-tighter text-foreground">Advanced Market Acquisition</h3>
                        <p className="text-muted-foreground mt-2 font-medium">Elevate your procurement strategy with integrated shopping lists and price estimation.</p>
                        <UpgradePlanDialog featureName="Market Lists">
                            <Button className="mt-8 shadow-lg shadow-primary/20 px-8 py-6 rounded-2xl font-bold uppercase tracking-widest text-xs">Unlock Market Intelligence</Button>
                        </UpgradePlanDialog>
                    </CardContent>
                </Card>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
