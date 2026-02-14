'use client';

import { useMemo } from 'react';
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
import { Pencil, Trash2, Mail, Phone, MapPin } from 'lucide-react';
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

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div>
      {customers && customers.length > 0 ? (
        <>
            {/* Mobile View */}
            <div className="space-y-4 md:hidden">
                {customers.map(customer => (
                    <Card key={customer.id}>
                         <CardHeader className="flex flex-row items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <CardTitle className="text-lg">{customer.name}</CardTitle>
                            </div>
                            <div className="flex items-center">
                                <AddCustomerDialog customer={customer}>
                                    <Button variant="ghost" size="icon">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </AddCustomerDialog>
                                <DeleteCustomerButton customerId={customer.id} />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2 text-sm text-muted-foreground">
                           {customer.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> <span>{customer.email}</span></div>}
                           {customer.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> <span>{customer.phone}</span></div>}
                           {customer.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> <span>{customer.address}</span></div>}
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
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {customers.map(customer => (
                    <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.email || '-'}</TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
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
          No customers added yet. Get started by adding one!
        </div>
      )}
    </div>
  );
}

    