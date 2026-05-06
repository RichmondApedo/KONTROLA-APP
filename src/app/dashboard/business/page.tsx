'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { IncomeSource, Expense, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown, ArrowUp, DollarSign, PlusCircle, Briefcase, CheckCircle2, Lock, ChevronRight, Shield, SwitchCamera } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const UpgradePlanDialog = dynamic(() => import('@/components/dashboard/upgrade-plan-dialog').then(mod => mod.UpgradePlanDialog));
const AddCustomerDialog = dynamic(() => import('@/components/dashboard/add-customer-dialog').then(mod => mod.AddCustomerDialog));
const AddInvoiceDialog = dynamic(() => import('@/components/dashboard/add-invoice-dialog').then(mod => mod.AddInvoiceDialog));
const AddReceiptDialog = dynamic(() => import('@/components/dashboard/add-receipt-dialog').then(mod => mod.AddReceiptDialog));

const BusinessOverview = dynamic(() => import('@/components/dashboard/business-overview').then(mod => mod.BusinessOverview), {
    loading: () => <BusinessOverviewSkeleton />,
    ssr: false,
});
const CustomerList = dynamic(() => import('@/components/dashboard/customer-list').then(mod => mod.CustomerList), {
  loading: () => <Skeleton className="h-80 w-full" />,
  ssr: false,
});
const InvoiceList = dynamic(() => import('@/components/dashboard/invoice-list').then(mod => mod.InvoiceList), {
  loading: () => <Skeleton className="h-80 w-full" />,
  ssr: false,
});
const ReceiptList = dynamic(() => import('@/components/dashboard/receipt-list').then(mod => mod.ReceiptList), {
  loading: () => <Skeleton className="h-80 w-full" />,
  ssr: false,
});
const BusinessTeamManagement = dynamic(() => import('@/components/dashboard/business-team-management').then(mod => mod.BusinessTeamManagement), {
  loading: () => <Skeleton className="h-80 w-full" />,
  ssr: false,
});


function BusinessOverviewSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-7">
                <Skeleton className="h-96 xl:col-span-4" />
                <Skeleton className="h-96 lg:col-span-1 xl:col-span-3" />
            </div>
        </div>
    );
}


import { usePeriod } from '@/components/period-provider';
import { PeriodSelector } from '@/components/dashboard/period-selector';

export default function BusinessPage() {
  const { user } = useUser();
  const { profile, activeProfile, activeProfileId, isProfileLoading, switchProfile } = useUserProfile();
 
  const { business } = usePeriod();
  const { 
    periodMode, 
    setPeriodMode, 
    startDate, 
    endDate, 
    customRange, 
    setCustomRange, 
    label 
  } = business;

  const dateRefs = useMemo(() => ({
    startOfMonth: startDate,
    endOfMonth: endDate
  }), [startDate, endDate]);

  const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
  const isProPlus = profile?.plan === 'pro-plus' || isAdmin;
  const currency = profile?.preferredCurrency || 'ghs';
  
  const isBusinessAccount = activeProfileId && activeProfileId !== user?.uid;
  const isOwner = activeProfile?.ownerUid === user?.uid;
 
  const [showScrollHint, setShowScrollHint] = useState(true);

  if (isProfileLoading) {
    return <BusinessOverviewSkeleton />;
  }



  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* --- EXPERT HEADER SECTION --- */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pt-4 pb-8 border-b border-border/10 relative min-h-[160px] xl:min-h-[140px]">
        <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Business Mode Active</span>
          </div>
          <h1 className="text-[clamp(1.75rem,7vw,4.5rem)] font-black font-headline tracking-tighter text-foreground leading-[0.85] sm:leading-[0.9]">
            Business Suite
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-bold uppercase tracking-widest opacity-60">
            Strategic control for <span className="text-primary">{label}</span>
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center flex-wrap xl:flex-nowrap gap-4 lg:gap-8 min-w-0">
          <div className="shrink-0 w-full md:w-auto">
              <PeriodSelector 
                  periodMode={periodMode}
                  onModeChange={setPeriodMode}
                  incomeDate={profile?.incomeDate}
                  label={label}
                  customRange={customRange}
                  onCustomRangeChange={setCustomRange}
              />
          </div>
        </div>
      </div>

      {/* Classic Terminal Identity Strip */}
      <div className="animate-in fade-in slide-in-from-top-4 duration-700 delay-200">
        <div className="rounded-2xl border border-border shadow-sm bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
                        <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black tracking-tight text-foreground">
                            {isBusinessAccount ? (activeProfile?.businessName || 'Business Workspace') : 'Personal Workspace'}
                        </h3>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-1.5">
                            <Shield className="h-2.5 w-2.5 text-primary" /> 
                            {isBusinessAccount ? (isOwner ? 'Account Owner' : 'Verified Delegate') : 'Primary Admin'}
                        </p>
                    </div>
                </div>
            
            <div className="flex items-center gap-3">
                {isBusinessAccount && (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => switchProfile(null)} 
                        className="rounded-xl font-bold uppercase tracking-widest text-[10px] border-primary/20 text-primary h-11 px-4 sm:px-6 transition-all hover:bg-primary/5 active:scale-95"
                    >
                        <SwitchCamera className="mr-2 h-4 w-4" /> 
                        <span className="hidden xs:inline">Exit Business Suite</span>
                        <span className="xs:hidden">Exit</span>
                    </Button>
                )}
                <div className="hidden sm:flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">System Operational</span>
                </div>
            </div>
        </div>
      </div>

       <Tabs defaultValue="overview" className="w-full space-y-8">
        <div className="relative group/tabs">
          <div 
            className="flex w-full overflow-x-auto px-4 sm:px-0 pb-1 no-scrollbar border-b border-border/40 scroll-smooth"
            onScroll={(e) => {
              if (showScrollHint && e.currentTarget.scrollLeft > 20) {
                setShowScrollHint(false);
              }
            }}
          >
            <TabsList className="inline-flex w-max justify-start sm:grid sm:w-full sm:grid-cols-5 bg-transparent p-0 gap-2 sm:gap-2 pr-12 sm:pr-0">
              <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 sm:px-6 py-2.5 transition-all font-bold text-[11px] sm:text-xs uppercase tracking-widest whitespace-nowrap"
              >
                  Overview
              </TabsTrigger>
              <TabsTrigger 
                  value="customers"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 sm:px-6 py-2.5 transition-all font-bold text-[11px] sm:text-xs uppercase tracking-widest whitespace-nowrap"
              >
                  Customers
              </TabsTrigger>
              <TabsTrigger 
                  value="invoices"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 sm:px-6 py-2.5 transition-all font-bold text-[11px] sm:text-xs uppercase tracking-widest whitespace-nowrap"
              >
                  Invoices
              </TabsTrigger>
              <TabsTrigger 
                  value="receipts"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 sm:px-6 py-2.5 transition-all font-bold text-[11px] sm:text-xs uppercase tracking-widest whitespace-nowrap"
              >
                  Receipts
              </TabsTrigger>
              <TabsTrigger 
                  value="management"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border border-transparent data-[state=active]:border-primary/20 rounded-xl px-4 sm:px-6 py-2.5 transition-all font-bold text-[11px] sm:text-xs uppercase tracking-widest whitespace-nowrap"
              >
                  Management
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Scroll Discovery Indicators (Mobile Only) */}
          <div className={cn(
            "absolute right-0 top-0 bottom-0 w-16 pointer-events-none transition-opacity duration-500 sm:hidden flex items-center justify-end px-2",
            showScrollHint ? "opacity-100" : "opacity-0"
          )}>
             <div className="absolute inset-0 bg-gradient-to-l from-background via-background/80 to-transparent" />
             <div className="relative z-10 animate-bounce-horizontal mr-1">
                <ChevronRight className="h-4 w-4 text-primary" />
             </div>
          </div>
        </div>
        <TabsContent value="overview">
          <BusinessOverview dateRefs={dateRefs} />
        </TabsContent>
        <TabsContent value="customers" className="mt-0 focus-visible:outline-none">
            <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
                <CardHeader className="flex-col md:flex-row items-start md:items-center justify-between gap-6 p-5 sm:p-8">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                             Full CRM List
                             <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                            Comprehensive customer relationship management
                        </CardDescription>
                    </div>
                    {isProPlus ? (
                        <AddCustomerDialog>
                            <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 group h-11 px-6 rounded-xl font-bold transition-all hover:scale-105 active:scale-95">
                                <PlusCircle className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" /> Add Customer
                            </Button>
                        </AddCustomerDialog>
                    ) : (
                        <UpgradePlanDialog featureName="Customer Management">
                            <Button className="w-full sm:w-auto bg-emerald-600/50 text-white shadow-lg shadow-emerald-500/20 group h-11 px-6 rounded-xl font-bold transition-all hover:scale-105 active:scale-95">
                                <Lock className="mr-2 h-4 w-4" /> Upgrade to Add
                            </Button>
                        </UpgradePlanDialog>
                    )}
                </CardHeader>
                <CardContent className="px-4 pb-8 sm:px-8">
                    <CustomerList />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="invoices" className="mt-0 focus-visible:outline-none">
           <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
                <CardHeader className="flex-col md:flex-row items-start md:items-center justify-between gap-6 p-5 sm:p-8">
                   <div className="space-y-1">
                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                             Digital Invoicing
                             <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                            Professional billing and receivable tracking
                        </CardDescription>
                   </div>
                    {isProPlus ? (
                        <AddInvoiceDialog currency={currency}>
                            <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 group h-11 px-6 rounded-xl font-bold transition-all hover:scale-105 active:scale-95">
                                <PlusCircle className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" /> New Invoice
                            </Button>
                        </AddInvoiceDialog>
                    ) : (
                        <UpgradePlanDialog featureName="Digital Invoicing">
                            <Button className="w-full sm:w-auto bg-emerald-600/50 text-white shadow-lg shadow-emerald-500/20 group h-11 px-6 rounded-xl font-bold transition-all hover:scale-105 active:scale-95">
                                <Lock className="mr-2 h-4 w-4" /> Upgrade to Invoice
                            </Button>
                        </UpgradePlanDialog>
                    )}
                </CardHeader>
                <CardContent className="px-4 pb-8 sm:px-8">
                    <InvoiceList />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="receipts" className="mt-0 focus-visible:outline-none">
            <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
                <CardHeader className="flex-col md:flex-row items-start md:items-center justify-between gap-6 p-5 sm:p-8">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                             Payment Receipts
                             <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                            Verified proof of transactions
                        </CardDescription>
                    </div>
                    {isProPlus ? (
                        <AddReceiptDialog currency={currency}>
                            <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 group h-11 px-6 rounded-xl font-bold transition-all hover:scale-105 active:scale-95">
                                <PlusCircle className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" /> Create Receipt
                            </Button>
                        </AddReceiptDialog>
                    ) : (
                        <UpgradePlanDialog featureName="Payment Receipts">
                            <Button className="w-full sm:w-auto bg-emerald-600/50 text-white shadow-lg shadow-emerald-500/20 group h-11 px-6 rounded-xl font-bold transition-all hover:scale-105 active:scale-95">
                                <Lock className="mr-2 h-4 w-4" /> Upgrade to Receipt
                            </Button>
                        </UpgradePlanDialog>
                    )}
                </CardHeader>
                <CardContent className="px-4 pb-8 sm:px-8">
                    <ReceiptList />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="management" className="mt-0 focus-visible:outline-none pb-20 sm:pb-0">
            <BusinessTeamManagement />
        </TabsContent>
      </Tabs>

      {/* Mobile Quick Action Dock - Adjusted to avoid covering BottomNav */}
      <div className="fixed bottom-24 left-0 right-0 z-50 p-4 sm:hidden pointer-events-none">
        <div className="max-w-md mx-auto flex items-center justify-around gap-2 p-2 rounded-2xl bg-card/80 backdrop-blur-md border border-border/40 shadow-2xl shadow-primary/20 pointer-events-auto animate-in slide-in-from-bottom-full duration-500">
            {isProPlus ? (
                <>
                    <AddInvoiceDialog currency={currency}>
                        <Button className="flex-1 h-12 rounded-xl bg-primary font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
                            <PlusCircle className="mr-2 h-4 w-4" /> New Invoice
                        </Button>
                    </AddInvoiceDialog>
                    <AddReceiptDialog currency={currency}>
                        <Button variant="outline" className="flex-1 h-12 rounded-xl border-emerald-500/20 text-emerald-600 bg-emerald-500/[0.03] font-black uppercase tracking-widest text-[10px] opacity-90 transition-all hover:bg-emerald-500 hover:text-white">
                            <PlusCircle className="mr-2 h-4 w-4" /> Create Receipt
                        </Button>
                    </AddReceiptDialog>
                </>
            ) : (
                <UpgradePlanDialog featureName="Business Suite">
                    <Button className="flex-1 w-full h-12 rounded-xl bg-primary font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
                        <Lock className="mr-2 h-4 w-4" /> Unlock Business Tools
                    </Button>
                </UpgradePlanDialog>
            )}
        </div>
      </div>
    </div>
  );
}
