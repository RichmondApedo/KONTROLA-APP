'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { IncomeSource, Expense, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown, ArrowUp, DollarSign, PlusCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
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


function BusinessOverviewSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-7">
                <Skeleton className="h-96 xl:col-span-4" />
                <Skeleton className="h-96 lg:col-span-1 xl:col-span-3" />
            </div>
        </div>
    );
}


export default function BusinessPage() {
  const { user } = useUser();
  const { profile, isProfileLoading } = useUserProfile();

  const isAdmin = profile?.role === 'admin' || user?.email === 'richmondapedo549@gmail.com';
  const isProPlus = profile?.plan === 'pro-plus' || isAdmin;
  const currency = profile?.preferredCurrency || 'ghs';
  
  if (isProfileLoading) {
    return <BusinessOverviewSkeleton />;
  }

  if (!isProPlus) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-bold">Upgrade to Pro Plus</h2>
        <p className="max-w-md text-muted-foreground">
          Business Account Management is an exclusive Pro Plus feature. Upgrade your plan to track your business finances separately.
        </p>
        <UpgradePlanDialog featureName="Business Account Management">
          <Button>Upgrade to Pro Plus</Button>
        </UpgradePlanDialog>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl font-black font-headline tracking-tighter text-primary flex items-center gap-3">
            <div className="h-8 w-1.5 bg-primary rounded-full" />
            Business Suite
        </h1>
        <p className="text-muted-foreground font-medium max-w-2xl">
            Command your enterprise finances with precision. Manage customers, invoices, and receipts from one unified, high-fidelity interface.
        </p>
      </div>

       <Tabs defaultValue="overview" className="w-full space-y-8">
        <div className="flex w-full overflow-x-auto pb-2 no-scrollbar border-b border-border/40">
          <TabsList className="inline-flex w-max min-w-full sm:grid sm:w-full sm:grid-cols-4 bg-transparent p-0 gap-4 sm:gap-2">
            <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border border-transparent data-[state=active]:border-primary/20 rounded-xl px-6 py-2.5 transition-all font-bold text-xs uppercase tracking-widest"
            >
                Overview
            </TabsTrigger>
            <TabsTrigger 
                value="customers"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border border-transparent data-[state=active]:border-primary/20 rounded-xl px-6 py-2.5 transition-all font-bold text-xs uppercase tracking-widest"
            >
                Customers
            </TabsTrigger>
            <TabsTrigger 
                value="invoices"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border border-transparent data-[state=active]:border-primary/20 rounded-xl px-6 py-2.5 transition-all font-bold text-xs uppercase tracking-widest"
            >
                Invoices
            </TabsTrigger>
            <TabsTrigger 
                value="receipts"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none border border-transparent data-[state=active]:border-primary/20 rounded-xl px-6 py-2.5 transition-all font-bold text-xs uppercase tracking-widest"
            >
                Receipts
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="overview">
          <BusinessOverview />
        </TabsContent>
        <TabsContent value="customers" className="mt-0 focus-visible:outline-none">
            <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
                <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 sm:p-8">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                             Full CRM List
                             <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        </CardTitle>
                        <CardDescription className="text-xs font-semibold uppercase tracking-widest opacity-70">
                            Comprehensive customer relationship management
                        </CardDescription>
                    </div>
                    <AddCustomerDialog>
                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 group h-11 px-6 rounded-xl font-bold transition-all hover:scale-105 active:scale-95">
                            <PlusCircle className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" /> Add Customer
                        </Button>
                    </AddCustomerDialog>
                </CardHeader>
                <CardContent className="px-6 pb-8 sm:px-8">
                    <CustomerList />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="invoices" className="mt-0 focus-visible:outline-none">
           <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
                <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 sm:p-8">
                   <div className="space-y-1">
                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                             Digital Invoicing
                             <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        </CardTitle>
                        <CardDescription className="text-xs font-semibold uppercase tracking-widest opacity-70">
                            Professional billing and receivable tracking
                        </CardDescription>
                   </div>
                    <AddInvoiceDialog currency={currency}>
                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 group h-11 px-6 rounded-xl font-bold transition-all hover:scale-105 active:scale-95">
                            <PlusCircle className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" /> New Invoice
                        </Button>
                    </AddInvoiceDialog>
                </CardHeader>
                <CardContent className="px-6 pb-8 sm:px-8">
                    <InvoiceList />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="receipts" className="mt-0 focus-visible:outline-none">
            <Card className="glass-card shadow-premium border-border/40 overflow-hidden">
                <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 sm:p-8">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                             Payment Receipts
                             <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        </CardTitle>
                        <CardDescription className="text-xs font-semibold uppercase tracking-widest opacity-70">
                            Verified proof of transactions
                        </CardDescription>
                    </div>
                    <AddReceiptDialog currency={currency}>
                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 group h-11 px-6 rounded-xl font-bold transition-all hover:scale-105 active:scale-95">
                            <PlusCircle className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" /> Create Receipt
                        </Button>
                    </AddReceiptDialog>
                </CardHeader>
                <CardContent className="px-6 pb-8 sm:px-8">
                    <ReceiptList />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
