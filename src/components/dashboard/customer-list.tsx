'use client';

import { useMemo, useState } from 'react';
import {
  useCollection,
  useFirestore,
  useUser,
  useUserProfile,
} from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import type { Customer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';
import { AddCustomerDialog } from './add-customer-dialog';
import { Pencil, Trash2, Mail, Phone, MapPin, Search, ShoppingBag, Sparkles, Crown, ShieldCheck, TrendingUp, Info } from 'lucide-react';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Input } from '../ui/input';
import { formatCurrency, cn, safeFormatDate } from '@/lib/utils';
import { format } from 'date-fns';


function DeleteCustomerButton({ customerId }: { customerId: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
  
    const handleDelete = () => {
      if (!user || !firestore) return;
      const customerRef = doc(firestore, 'users', user.uid, 'customers', customerId);
      deleteDocumentNonBlocking(customerRef);
      toast({ title: 'Customer Deleted', description: 'The customer has been removed from your list.' });
    };
  
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this customer and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
}

export function CustomerList() {
  const { user } = useUser();
  const { profile } = useUserProfile();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const currency = profile?.preferredCurrency || 'ghs';

  const customersQuery = useMemo(
    () =>
      user && firestore
        ? query(
            collection(firestore, 'users', user.uid, 'customers'),
            orderBy('createdAt', 'desc')
          )
        : null,
    [user, firestore]
  );

  const { data: customers, isLoading } = useCollection<Customer>(customersQuery);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [] as Customer[];
    if (!searchQuery) return customers;
    
    const lowercasedQuery = searchQuery.toLowerCase();
    
    return customers.filter((customer: Customer) => 
      customer.name.toLowerCase().includes(lowercasedQuery) ||
      (customer.email && customer.email.toLowerCase().includes(lowercasedQuery)) ||
      (customer.phone && customer.phone.includes(lowercasedQuery))
    );
  }, [customers, searchQuery]);

  const maxRevenue = useMemo(() => {
    if (!filteredCustomers.length) return 1;
    return Math.max(...filteredCustomers.map((c: Customer) => c.totalRevenue || 0), 1);
  }, [filteredCustomers]);

  const getPartnerStatus = (revenue: number = 0) => {
    if (revenue >= 5000) return { label: 'Titan Asset', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    if (revenue >= 1000) return { label: 'Elite Partner', icon: Sparkles, color: 'text-indigo-500', bg: 'bg-indigo-500/10' };
    if (revenue > 0) return { label: 'Preferred', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    return { label: 'Prospect', icon: MapPin, color: 'text-muted-foreground', bg: 'bg-muted/10' };
  };


  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
          />
      </div>

      {filteredCustomers && filteredCustomers.length > 0 ? (
        <>
            {/* Mobile View */}
            <div className="space-y-4 md:hidden">
                {filteredCustomers.map((customer: Customer) => {
                    const status = getPartnerStatus(customer.totalRevenue);
                    const revenuePercent = ((customer.totalRevenue || 0) / maxRevenue) * 100;
                    
                    return (
                        <Card key={customer.id} className="glass-card shadow-soft border-border/40 overflow-hidden group hover:border-primary/20 transition-all duration-500">
                             <CardHeader className="flex flex-row items-center justify-between p-5 pb-3">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-10 w-10 border border-primary/20 shadow-inner group-hover:scale-110 transition-transform">
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{customer.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-0.5">
                                        <CardTitle className="text-lg font-black tracking-tight">{customer.name}</CardTitle>
                                        <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-[10px]">
                                            <status.icon className={cn("h-3 w-3", status.color)} />
                                            <span className={status.color}>{status.label}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <AddCustomerDialog customer={customer}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-colors">
                                            <Pencil className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </AddCustomerDialog>
                                    <DeleteCustomerButton customerId={customer.id} />
                                </div>
                            </CardHeader>
                            <CardContent className="px-5 pb-5 space-y-5 text-sm">
                               <div className="text-muted-foreground space-y-2.5">
                                    {customer.email && <div className="flex items-center gap-3 font-medium"><Mail className="h-4 w-4 text-primary/60" /> <span>{customer.email}</span></div>}
                                    {customer.phone && <div className="flex items-center gap-3 font-medium"><Phone className="h-4 w-4 text-primary/60" /> <span>{customer.phone}</span></div>}
                               </div>
                               
                               {(customer.totalRevenue || 0) > 0 && (
                                    <div className="space-y-2 pt-1">
                                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                            <span>Portfolio Impact</span>
                                            <span className="text-primary">{formatCurrency(customer.totalRevenue || 0, currency)}</span>
                                        </div>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Progress value={revenuePercent} className="h-1.5 bg-primary/5" />
                                                </TooltipTrigger>
                                                <TooltipContent className="text-[10px] font-black tracking-widest bg-primary text-white border-none">
                                                    Relative Impact: {revenuePercent.toFixed(1)}%
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                               )}

                               {customer.lastPurchaseDate && (
                                   <div className="pt-3 border-t border-border/40 flex justify-between items-center">
                                       <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Last Acquisition</p>
                                       <p className="font-bold text-xs">
                                           {safeFormatDate(customer.lastPurchaseDate, 'MMM d, yyyy')}
                                       </p>
                                   </div>
                               )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="hidden md:block overflow-hidden rounded-xl border border-border/40">
                <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b border-border/40">
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest px-6 py-4">Name</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest px-6 py-4">Contact</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest px-6 py-4">Total Revenue</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest px-6 py-4">Last Purchase</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest px-6 py-4">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredCustomers.map((customer: Customer) => {
                        const status = getPartnerStatus(customer.totalRevenue);
                        const revenuePercent = ((customer.totalRevenue || 0) / maxRevenue) * 100;

                        return (
                            <TableRow key={customer.id} className="group transition-colors hover:bg-primary/5 duration-300 border-b border-border/40 last:border-0">
                                <TableCell className="px-6 py-4">
                                    <div className="font-bold text-sm tracking-tight">{customer.name}</div>
                                    <div className={cn("text-[9px] font-black uppercase tracking-widest flex items-center gap-1", status.color)}>
                                        <status.icon className="h-2.5 w-2.5" />
                                        {status.label}
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                    <div className="text-[11px] font-bold uppercase tracking-tight text-foreground/80">{customer.email || '-'}</div>
                                    <div className="text-[10px] font-medium text-muted-foreground">{customer.phone || '-'}</div>
                                </TableCell>
                                <TableCell className="text-right px-6 py-4">
                                    <div className="font-black text-lg tracking-tighter text-primary group-hover:scale-105 transition-transform origin-right">
                                        {formatCurrency(customer.totalRevenue || 0, currency)}
                                    </div>
                                    <div className="flex justify-end gap-2 items-center mt-1">
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Impact</span>
                                        <div className="w-16 h-1 bg-primary/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary" style={{ width: `${revenuePercent}%` }} />
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground px-6 py-4">
                                    {safeFormatDate(customer.lastPurchaseDate, 'MMM d, yyyy') || '-'}
                                </TableCell>
                                <TableCell className="text-right px-6 py-4">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <AddCustomerDialog customer={customer}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-colors">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </AddCustomerDialog>
                                        <DeleteCustomerButton customerId={customer.id} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
                </Table>
            </div>
        </>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          {customers && customers.length > 0 ? 'No customers match your search.' : 'No customers added yet. Get started by adding one!'}
        </div>
      )}
    </div>
  );
}
