'use client';

import { useMemo, useState } from 'react';
import {
  useCollection,
  useFirestore,
  useUser,
} from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import type { Customer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';
import { AddCustomerDialog } from './add-customer-dialog';
import { Pencil, Trash2, Mail, Phone, MapPin, Search, DollarSign, ShoppingBag } from 'lucide-react';
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
import { formatCurrency } from '@/lib/utils';
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
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');

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
    if (!customers) return [];
    if (!searchQuery) return customers;
    
    const lowercasedQuery = searchQuery.toLowerCase();
    
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(lowercasedQuery) ||
      (customer.email && customer.email.toLowerCase().includes(lowercasedQuery)) ||
      (customer.phone && customer.phone.includes(lowercasedQuery))
    );
  }, [customers, searchQuery]);


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
                {filteredCustomers.map(customer => (
                    <Card key={customer.id} className="glass-card shadow-soft border-border/40 overflow-hidden group hover:border-primary/30 transition-all duration-300">
                         <CardHeader className="flex flex-row items-center justify-between p-5 pb-3">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10 border border-primary/20 shadow-inner">
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{customer.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-0.5">
                                    <CardTitle className="text-lg font-black tracking-tight">{customer.name}</CardTitle>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Loyal Partner</p>
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
                        <CardContent className="px-5 pb-5 space-y-4 text-sm">
                           <div className="text-muted-foreground space-y-2.5">
                                {customer.email && <div className="flex items-center gap-3 font-medium"><Mail className="h-4 w-4 text-primary/60" /> <span>{customer.email}</span></div>}
                                {customer.phone && <div className="flex items-center gap-3 font-medium"><Phone className="h-4 w-4 text-primary/60" /> <span>{customer.phone}</span></div>}
                           </div>
                           <div className="pt-4 border-t border-border/40 grid grid-cols-2 gap-4">
                                {(customer.totalRevenue || 0) > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Revenue</p>
                                        <p className="font-black text-primary">{formatCurrency(customer.totalRevenue || 0)}</p>
                                    </div>
                                )}
                                {customer.lastPurchaseDate && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Last Purchase</p>
                                        <p className="font-bold text-xs truncate">
                                            {format(new Date((customer.lastPurchaseDate as any).toDate ? (customer.lastPurchaseDate as any).toDate() : customer.lastPurchaseDate), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                )}
                           </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead>Last Purchase</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredCustomers.map(customer => (
                    <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                            <div>{customer.email || '-'}</div>
                            <div>{customer.phone || '-'}</div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(customer.totalRevenue || 0)}</TableCell>
                        <TableCell>{customer.lastPurchaseDate ? format(new Date((customer.lastPurchaseDate as any).toDate ? (customer.lastPurchaseDate as any).toDate() : customer.lastPurchaseDate), 'PPP') : '-'}</TableCell>
                        <TableCell className="text-right space-x-1">
                            <AddCustomerDialog customer={customer}>
                                <Button variant="ghost" size="icon">
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </AddCustomerDialog>
                            <DeleteCustomerButton customerId={customer.id} />
                        </TableCell>
                    </TableRow>
                    ))}
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
