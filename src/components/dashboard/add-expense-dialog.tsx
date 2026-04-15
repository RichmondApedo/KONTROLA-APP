'use client';

import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUserProfile, useUser, useFirestore } from '@/firebase';
import { CurrencyIcon } from './currency-symbol';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useState, useEffect } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { 
  PlusCircle, 
  Car, 
  Fuel, 
  Info, 
  TrendingUp, 
  Activity, 
  Gauge 
} from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { ScrollArea } from '../ui/scroll-area';
import { SingleDatePicker } from '../ui/single-date-picker';
import { Switch } from '../ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';


const expenseSchema = z.object({
  description: z.string()
    .min(1, 'Please enter a description.')
    .trim()
    .transform(s => s.replace(/<[^>]*>?/gm, '')),
  amount: z.coerce.number().positive('Please enter a positive amount.'),
  category: z.string().min(1, 'Please select a category.'),
  date: z.date({ required_error: 'Please enter a valid date.' }),
  context: z.enum(['personal', 'business']).default('personal'),
  fuelLiters: z.coerce.number().optional(),
  fuelPricePerUnit: z.coerce.number().optional(),
  station: z.string().trim().transform(s => s.replace(/<[^>]*>?/gm, '')).optional(),
  odometer: z.coerce.number().optional(),
  fuelVehicleName: z.string().trim().transform(s => s.replace(/<[^>]*>?/gm, '')).optional(),
  fuelIsFullTank: z.boolean().default(true),
  fuelType: z.string().optional(),
}).refine((data) => {
    const isFuel = data.category.toLowerCase() === 'fuel';
    if (isFuel) {
        // Only fuelLiters is strictly required for volume math
        if (!data.fuelLiters || data.fuelLiters <= 0) return false;
    }
    return true;
}, (data) => ({
    message: "Liters are required for fuel entries to ensure accurate telematics.",
    path: ["fuelLiters"],
}));

interface AddExpenseDialogProps {
  currency: string;
  plan?: 'free' | 'premium' | 'pro-plus';
  defaultCategory?: string;
  trigger?: React.ReactNode;
}

const personalCategories = [
    // Physiological Needs
    'Rent',
    'Food',
    'Water Bills',
    'ECG Bills',
    // Safety Needs
    'Health',
    'Transport',
    'Household',
    'Fuel',
    // Social & Esteem Needs
    'Shopping',
    'Entertainment',
    'Church Contributions',
    'Funeral Donations',
    // Self-Actualization
    'Education',
    'Travel',
    'Business',
    'Other',
];

export function AddExpenseDialog({ currency, plan, defaultCategory, trigger }: AddExpenseDialogProps) {
  const { user } = useUser();
  const { profile, activeProfileId } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const targetUid = activeProfileId || user?.uid;
  
  const [lastFuelPrice, setLastFuelPrice] = useState<number | null>(null);
  const [lastFuelDate, setLastFuelDate] = useState<Date | null>(null);
  const [lastOdometer, setLastOdometer] = useState<number | null>(null);
  const [recentStations, setRecentStations] = useState<string[]>([]);
  const isProPlus = plan === 'pro-plus';

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      amount: 0,
      category: defaultCategory || '',
      date: new Date(),
      context: 'personal',
      fuelIsFullTank: true,
      fuelVehicleName: 'Primary Vehicle',
      fuelType: 'Petrol',
    },
});

  useEffect(() => {
    if (open) {
      if (defaultCategory) {
        form.setValue('category', defaultCategory);
      } else {
        form.setValue('category', '');
      }
    }
  }, [open, defaultCategory, form]);

  const categoryValue = form.watch('category');
  const amountValue = form.watch('amount');
  const fuelLitersValue = form.watch('fuelLiters');
  const fuelPricePerUnitValue = form.watch('fuelPricePerUnit');

  const isFuelCategory = useMemo(() => {
    const cat = categoryValue?.toLowerCase();
    return cat === 'fuel' || cat === 'transport';
  }, [categoryValue]);

  // Fetch last fuel price
  useEffect(() => {
    const fetchLastFuelStats = async () => {
      if (open && isFuelCategory && targetUid && firestore) {
        const expensesRef = collection(firestore, 'users', targetUid, 'expenses');
        const q = query(
          expensesRef, 
          where('category', 'in', ['Fuel', 'Transport', 'fuel', 'transport']),
          orderBy('date', 'desc'),
          limit(20)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const fuelDocs = querySnapshot.docs.map(doc => doc.data());
          const latestFuelDoc = fuelDocs[0];

          if (latestFuelDoc.fuelPricePerUnit) {
            setLastFuelPrice(latestFuelDoc.fuelPricePerUnit);
            
            let date = new Date();
            try {
                if (latestFuelDoc.date?.toDate) {
                    date = latestFuelDoc.date.toDate();
                } else if (latestFuelDoc.date) {
                    date = new Date(latestFuelDoc.date);
                }
                if (isNaN(date.getTime())) date = new Date();
            } catch {
                date = new Date();
            }
            setLastFuelDate(date);
          }
          
          if (latestFuelDoc.odometer) {
            setLastOdometer(latestFuelDoc.odometer);
          }
          if (latestFuelDoc.fuelVehicleName) {
            form.setValue('fuelVehicleName', latestFuelDoc.fuelVehicleName);
          }
          
          // Get unique stations from the last 20 entries
          const uniqueStations = Array.from(new Set(
            fuelDocs
              .map(doc => doc.station)
              .filter(s => !!s && typeof s === 'string')
          )).slice(0, 4);
          setRecentStations(uniqueStations);
        }
      }
    };
    fetchLastFuelStats();
  }, [open, isFuelCategory, user, firestore]);

  // Auto-calculation logic
  const [isInternalUpdate, setIsInternalUpdate] = useState(false);

  useEffect(() => {
      if (!isFuelCategory || isInternalUpdate) return;

      const timer = setTimeout(() => {
        if (amountValue > 0 && fuelLitersValue && fuelLitersValue > 0) {
            const calculatedPrice = amountValue / fuelLitersValue;
            if (Math.abs(calculatedPrice - (fuelPricePerUnitValue || 0)) > 0.01) {
                setIsInternalUpdate(true);
                form.setValue('fuelPricePerUnit', parseFloat(calculatedPrice.toFixed(2)));
                setTimeout(() => setIsInternalUpdate(false), 100);
            }
        }
      }, 500);
      return () => clearTimeout(timer);
  }, [amountValue, fuelLitersValue, categoryValue]);

  useEffect(() => {
    if (!isFuelCategory || isInternalUpdate) return;

    const timer = setTimeout(() => {
      if (fuelPricePerUnitValue && fuelPricePerUnitValue > 0 && fuelLitersValue && fuelLitersValue > 0) {
          const calculatedAmount = fuelPricePerUnitValue * fuelLitersValue;
          if (Math.abs(calculatedAmount - amountValue) > 0.01) {
              setIsInternalUpdate(true);
              form.setValue('amount', parseFloat(calculatedAmount.toFixed(2)));
              setTimeout(() => setIsInternalUpdate(false), 100);
          }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [fuelPricePerUnitValue, fuelLitersValue, categoryValue]);

  const context = form.watch('context');
  const descriptionValue = form.watch('description');

  const onSubmit = (values: z.infer<typeof expenseSchema>) => {
    if (!user || !firestore || !targetUid) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be signed in to add an expense.',
      });
      return;
    }
    
    const expenseData: any = {
        ...values,
        userId: targetUid,
        currency: currency,
        context: isProPlus ? values.context : 'personal',
        creatorId: user.uid,
        creatorName: profile?.name || user.displayName || user.email?.split('@')[0] || 'Unknown',
        creatorEmail: user.email,
    };

    const isTrulyFuelOrTransport = ['fuel', 'transport'].includes(values.category.toLowerCase());
    if (!isTrulyFuelOrTransport) {
        delete expenseData.fuelLiters;
        delete expenseData.fuelPricePerUnit;
        delete expenseData.station;
        delete expenseData.odometer;
        delete expenseData.fuelVehicleName;
    } else {
        if (!expenseData.fuelLiters) delete expenseData.fuelLiters;
        if (!expenseData.fuelPricePerUnit) delete expenseData.fuelPricePerUnit;
        if (!expenseData.station) delete expenseData.station;
        if (!expenseData.odometer) delete expenseData.odometer;
        if (!expenseData.fuelVehicleName) delete expenseData.fuelVehicleName;
        if (!expenseData.fuelType) delete expenseData.fuelType;
    }

    addDocumentNonBlocking(collection(firestore, 'users', targetUid, 'expenses'), expenseData);

    toast({
      title: 'Expense Added',
      description: 'The new expense has been saved.',
    });
    form.reset();
    setOpen(false);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={setOpen}
      trigger={trigger || <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Expense</Button>}
      title="Add Expense"
      description="Record a new personal or business expense."
      className="sm:max-w-md"
    >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
                <div className="space-y-4">
                    {isProPlus && (
                        <FormField
                            control={form.control}
                            name="context"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Type</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-row space-x-4"
                                    >
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="personal" />
                                        </FormControl>
                                        <FormLabel className="font-bold text-xs uppercase tracking-tight">Personal</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="business" />
                                        </FormControl>
                                        <FormLabel className="font-bold text-xs uppercase tracking-tight">Business</FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">What is this for?</FormLabel>
                            <FormControl>
                                <Textarea 
                                    placeholder={context === 'business' ? "e.g., Cloud Infrastructure, Office Lease" : "e.g., Weekly Groceries, Movie Night"} 
                                    {...field} 
                                    className="min-h-[100px] rounded-xl bg-muted/30 border-border/40 focus:bg-background"
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Amount</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded bg-muted/50 border border-border/50">
                                            <CurrencyIcon currency={profile?.preferredCurrency} className="h-2.5 w-2.5" />
                                        </div>
                                        <Input type="number" placeholder="0.00" {...field} className="pl-9 h-12 rounded-xl bg-muted/30 border-border/40" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Date</FormLabel>
                                <FormControl>
                                    <SingleDatePicker
                                    date={field.value}
                                    onDateChange={field.onChange}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Category</FormLabel>
                            {context === 'personal' ? (
                                <div className="space-y-4">
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                        <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-border/40">
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="glass-card shadow-premium border-border/40">
                                        {personalCategories.map((category) => (
                                            <SelectItem key={category} value={category} className="font-bold text-xs">
                                            {category}
                                            </SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                  <FormControl>
                                      <Input
                                      placeholder="e.g., Marketing, Utilities"
                                      {...field}
                                      className="h-12 rounded-xl bg-muted/30 border-border/40"
                                      />
                                  </FormControl>
                                </div>
                            )}
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    {isFuelCategory && (
                        <div className="space-y-4 pt-2">
                            <div className="bg-primary/5 rounded-2xl p-4 sm:p-6 border border-primary/10 space-y-6 shadow-inner">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                                        <Gauge className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Vehicle Intelligence</h4>
                                        <p className="text-[9px] font-medium text-muted-foreground leading-none mt-0.5">Track fuel, station, and odometer</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <FormField
                                        control={form.control}
                                        name="fuelVehicleName"
                                        render={({ field }) => (
                                            <FormItem className="sm:col-span-2">
                                                <FormLabel className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                                    <Car className="h-3 w-3" />
                                                    Vehicle Name
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Primary Vehicle" {...field} value={field.value || ''} className="glass-card h-11 border-border/40 focus:border-primary/40 text-sm" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="fuelType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                                    <Fuel className="h-3 w-3" />
                                                    Fuel Type
                                                </FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || 'Petrol'}>
                                                    <FormControl>
                                                        <SelectTrigger className="glass-card h-11 border-border/40 text-sm">
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Petrol">Petrol</SelectItem>
                                                        <SelectItem value="Diesel">Diesel</SelectItem>
                                                        <SelectItem value="EV Charge">EV Charge</SelectItem>
                                                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="station"
                                        render={({ field }) => (
                                            <FormItem className="sm:col-span-2">
                                                <FormLabel className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                                    <TrendingUp className="h-3 w-3" />
                                                    Gas Station
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Shell, Total" {...field} value={field.value || ''} className="glass-card h-11 border-border/40 focus:border-primary/40 text-sm" />
                                                </FormControl>
                                                {recentStations.length > 0 && (
                                                    <div className="flex flex-col gap-1.5 mt-2">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Recent Stations</p>
                                                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
                                                        {recentStations.map((s) => (
                                                            <Button key={s} type="button" variant="outline" size="sm" className="h-8 py-0 px-3 text-[9px] font-black tracking-widest uppercase border-primary/20 hover:bg-primary/10 hover:text-primary transition-all rounded-full shadow-sm bg-background/50 whitespace-nowrap" onClick={() => form.setValue('station', s, { shouldValidate: true })}>
                                                                {s}
                                                            </Button>
                                                        ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="fuelLiters"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                                    <Activity className="h-3 w-3" />
                                                    Quantity (L)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value || ''} className="glass-card h-11 border-border/40 focus:border-primary/40 text-sm" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="fuelPricePerUnit"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                                    <div className="flex items-center gap-2">
                                                        <CurrencyIcon currency={currency} className="h-3 w-3" />
                                                        Price per Liter
                                                    </div>
                                                    {lastFuelPrice && (
                                                        <span className="text-[9px] font-extrabold text-primary px-1.5 py-0.5 rounded-full bg-primary/10">
                                                            Last: {formatCurrency(lastFuelPrice, currency)}
                                                        </span>
                                                    )}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value || ''} className="glass-card h-11 border-border/40 focus:border-primary/40 text-sm" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="odometer"
                                        render={({ field }) => (
                                            <FormItem className="sm:col-span-2">
                                                <FormLabel className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                                    <div className="flex items-center gap-2">
                                                        <Activity className="h-3 w-3" />
                                                        Odometer (km)
                                                    </div>
                                                    {lastOdometer && (
                                                        <span className="text-[10px] font-bold text-muted-foreground/60">
                                                            Previous: {lastOdometer.toLocaleString()} km
                                                        </span>
                                                    )}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="Enter current reading" {...field} value={field.value || ''} className="glass-card h-11 border-primary/20 focus:border-primary/40 text-sm" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="fuelIsFullTank"
                                        render={({ field }) => (
                                            <FormItem className="sm:col-span-2 flex flex-row items-center justify-between rounded-2xl border border-primary/10 p-4 bg-background/40 shadow-inner group/switch">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover/switch:bg-primary/20 transition-colors">
                                                        <Fuel className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-[11px] font-black uppercase tracking-widest">Full Tank</FormLabel>
                                                        <p className="text-[9px] font-medium text-muted-foreground leading-none">Helps with mileage tracking</p>
                                                    </div>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
             <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-12 rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 rounded-xl font-black bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
                    {form.formState.isSubmitting ? 'Saving...' : 'Add Expense'}
                </Button>
            </div>
          </form>
        </Form>
    </ResponsiveModal>
  );
}
