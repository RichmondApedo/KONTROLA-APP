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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Business Dashboard</h1>
        <p className="text-muted-foreground">Manage your business overview, customers, invoices, and receipts.</p>
      </div>

       <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <BusinessOverview />
        </TabsContent>
        <TabsContent value="customers" className="mt-6">
            <Card>
                <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Your Customer List</CardTitle>
                        <CardDescription>
                            Here is a list of all your customers.
                        </CardDescription>
                    </div>
                    <AddCustomerDialog>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
                        </Button>
                    </AddCustomerDialog>
                </CardHeader>
                <CardContent>
                    <CustomerList />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="invoices" className="mt-6">
           <Card>
                <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                   <div>
                        <CardTitle>Your Invoices</CardTitle>
                        <CardDescription>
                            Here is a list of all your invoices.
                        </CardDescription>
                   </div>
                    <AddInvoiceDialog currency={currency}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Invoice
                        </Button>
                    </AddInvoiceDialog>
                </CardHeader>
                <CardContent>
                    <InvoiceList />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="receipts" className="mt-6">
            <Card>
                <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Your Payment Receipts</CardTitle>
                        <CardDescription>
                            Here is a list of all your generated receipts.
                        </CardDescription>
                    </div>
                    <AddReceiptDialog currency={currency}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create Receipt
                        </Button>
                    </AddReceiptDialog>
                </CardHeader>
                <CardContent>
                    <ReceiptList />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
