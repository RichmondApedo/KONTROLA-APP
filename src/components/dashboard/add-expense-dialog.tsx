'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useState, useEffect } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { 
  Loader2, 
  PlusCircle, 
  Sparkles, 
  Car, 
  Fuel, 
  Info, 
  TrendingUp, 
  Activity, 
  DollarSign, 
  Gauge 
} from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { ScrollArea } from '../ui/scroll-area';
import { suggestExpenseCategories } from '@/ai/flows/expense-category-suggestions';
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
}).refine((data) => {
    const isFuel = data.category.toLowerCase() === 'fuel';
    if (isFuel) {
        if (!data.station || data.station.trim() === '') return false;
        if (!data.fuelLiters || data.fuelLiters <= 0) return false;
        if (!data.odometer || data.odometer <= 0) return false;
    }
    return true;
}, (data) => ({
    message: "Liters, Odometer, and Station are required for fuel entries to ensure accurate telematics.",
    path: !data.station || data.station.trim() === '' ? ["station"] : 
          (!data.fuelLiters || data.fuelLiters <= 0) ? ["fuelLiters"] : ["odometer"],
}));

interface AddExpenseDialogProps {
  currency: string;
  plan?: 'free' | 'premium' | 'pro-plus';
  defaultCategory?: string;
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

export function AddExpenseDialog({ currency, plan, defaultCategory }: AddExpenseDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [lastFuelPrice, setLastFuelPrice] = useState<number | null>(null);
  const [lastFuelDate, setLastFuelDate] = useState<Date | null>(null);
  const [lastOdometer, setLastOdometer] = useState<number | null>(null);
  const [recentStations, setRecentStations] = useState<string[]>([]);
  const isProPlus = plan === 'pro-plus';
  const hasAIAccess = plan === 'premium' || plan === 'pro-plus';

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

  const isFuelCategory = categoryValue?.toLowerCase() === 'fuel';

  // Fetch last fuel price
  useEffect(() => {
    const fetchLastFuelPrice = async () => {
      if (open && isFuelCategory && user && firestore) {
        const expensesRef = collection(firestore, 'users', user.uid, 'expenses');
        const q = query(
          expensesRef, 
          where('category', '==', 'Fuel'),
          orderBy('date', 'desc'),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const lastFuelDoc = querySnapshot.docs[0].data();
          if (lastFuelDoc.fuelPricePerUnit) {
            setLastFuelPrice(lastFuelDoc.fuelPricePerUnit);
            const date = lastFuelDoc.date?.toDate ? lastFuelDoc.date.toDate() : new Date(lastFuelDoc.date);
            setLastFuelDate(date);
          }
          if (lastFuelDoc.odometer) {
            setLastOdometer(lastFuelDoc.odometer);
          }
          if (lastFuelDoc.fuelVehicleName) {
            form.setValue('fuelVehicleName', lastFuelDoc.fuelVehicleName);
          }
          
          // Also get unique stations from recent entries
          const stationsRef = collection(firestore, 'users', user.uid, 'expenses');
          const sQ = query(
            stationsRef,
            where('category', '==', 'Fuel'),
            orderBy('date', 'desc'),
            limit(20)
          );
          const sSnap = await getDocs(sQ);
          const uniqueStations = Array.from(new Set(
            sSnap.docs
              .map(doc => doc.data().station)
              .filter(s => !!s && typeof s === 'string')
          )).slice(0, 4); // Limit to 4 for clean UI
          setRecentStations(uniqueStations);
        }
      }
    };
    fetchLastFuelPrice();
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

  const handleSuggestCategories = async () => {
    if (!descriptionValue) {
      toast({
        variant: 'destructive',
        title: 'Description needed',
        description: 'Please enter a description before getting suggestions.',
      });
      return;
    }
    setIsSuggesting(true);
    try {
      const result = await suggestExpenseCategories({ description: descriptionValue });
      setSuggestions(result.suggestions);
      toast({ title: 'Suggestions Loaded!', description: 'AI has suggested some categories for you.' });
    } catch (error: any) {
      console.error('Category suggestion error:', error);
      toast({
        variant: 'destructive',
        title: 'Suggestion Failed',
        description: error.message || 'Could not get AI suggestions. Please try again.',
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const allPersonalCategories = useMemo(() => {
    const combined = new Set([...personalCategories, ...suggestions]);
    return Array.from(combined);
  }, [suggestions]);

  const onSubmit = (values: z.infer<typeof expenseSchema>) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be signed in to add an expense.',
      });
      return;
    }
    
    const expenseData: any = {
        ...values,
        userId: user.uid,
        currency: currency,
        context: isProPlus ? values.context : 'personal',
    };

    if (values.category !== 'Fuel') {
        delete expenseData.fuelLiters;
        delete expenseData.fuelPricePerUnit;
        delete expenseData.station;
        delete expenseData.odometer; // Added odometer deletion
    } else {
        if (!expenseData.fuelLiters) delete expenseData.fuelLiters;
        if (!expenseData.fuelPricePerUnit) delete expenseData.fuelPricePerUnit;
        if (!expenseData.station) delete expenseData.station;
        if (!expenseData.odometer) delete expenseData.odometer;
        if (!expenseData.fuelVehicleName) delete expenseData.fuelVehicleName;
    }

    addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'expenses'), expenseData);

    toast({
      title: 'Expense Added',
      description: 'The new expense has been saved.',
    });
    form.reset();
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Add a new expense to your records.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4">
                    {isProPlus && (
                        <FormField
                        control={form.control}
                        name="context"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                            <FormLabel>Account Context</FormLabel>
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
                                    <FormLabel className="font-normal">Personal</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="business" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Business</FormLabel>
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                            <Textarea placeholder={context === 'business' ? "e.g., Office Supplies" : "e.g., Lunch with friends"} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    {hasAIAccess && !isFuelCategory && (
                      <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleSuggestCategories} disabled={isSuggesting}>
                        {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        {isSuggesting ? 'Thinking...' : 'Suggest Category with AI'}
                      </Button>
                    )}
                    <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 85.50" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        {context === 'personal' ? (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {allPersonalCategories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                    {category}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div>
                              <FormControl>
                                  <Input
                                  placeholder="e.g., Marketing, Utilities"
                                  {...field}
                                  />
                              </FormControl>
                               {suggestions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                      <p className="text-xs text-muted-foreground w-full">Suggestions:</p>
                                      {suggestions.map(s => (
                                          <Button key={s} type="button" variant="outline" size="sm" className="h-auto py-1 px-2 text-xs" onClick={() => form.setValue('category', s, { shouldValidate: true })}>
                                              {s}
                                          </Button>
                                      ))}
                                  </div>
                              )}
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
                                        <p className="text-[9px] font-medium text-muted-foreground leading-none mt-0.5">Telematics for accurate mapping</p>
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
                                                    Asset Name
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Toyota Camry, Delivery Van" {...field} value={field.value || ''} className="glass-card h-11 border-border/40 focus:border-primary/40 text-sm" />
                                                </FormControl>
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
                                                    Refuel Station
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Shell, Total" {...field} value={field.value || ''} className="glass-card h-11 border-border/40 focus:border-primary/40 text-sm" />
                                                </FormControl>
                                                {recentStations.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-2 px-1">
                                                        {recentStations.map((s) => (
                                                            <Button
                                                                key={s}
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 py-0 px-3 text-[9px] font-black tracking-widest uppercase border-primary/20 hover:bg-primary/10 hover:text-primary transition-all rounded-full shadow-sm bg-background/50"
                                                                onClick={() => form.setValue('station', s, { shouldValidate: true })}
                                                            >
                                                                {s}
                                                            </Button>
                                                        ))}
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
                                                    Volume (L)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" placeholder="e.g., 20" {...field} value={field.value || ''} className="glass-card h-11 border-border/40 focus:border-primary/40 text-sm" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="space-y-2">
                                        <FormField
                                            control={form.control}
                                            name="fuelPricePerUnit"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                                        <div className="flex items-center gap-2">
                                                            <DollarSign className="h-3 w-3" />
                                                            Price/L
                                                        </div>
                                                        {lastFuelPrice && (
                                                            <span className="text-[9px] font-extrabold text-primary px-1.5 py-0.5 rounded-full bg-primary/10">
                                                                Last: {formatCurrency(lastFuelPrice, currency)}
                                                            </span>
                                                        )}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" placeholder="..." {...field} value={field.value || ''} className="glass-card h-11 border-border/40 focus:border-primary/40 text-sm" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
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
                                                            Latest: {lastOdometer.toLocaleString()} km
                                                        </span>
                                                    )}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="..." {...field} value={field.value || ''} className="glass-card h-11 border-primary/20 focus:border-primary/40 text-sm" />
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
                                                        <FormLabel className="text-[11px] font-black uppercase tracking-widest">Full Tank Fill-up</FormLabel>
                                                        <p className="text-[9px] font-medium text-muted-foreground leading-none">For precision mapping</p>
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
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
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
            </ScrollArea>
            <DialogFooter className="mt-4 pt-4 border-t">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Expense'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
