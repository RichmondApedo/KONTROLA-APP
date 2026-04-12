'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore, useUserProfile } from '@/firebase';
import { collection } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Fuel, TrendingUp, Activity, Car, Zap } from 'lucide-react';
import { CurrencyIcon } from './currency-symbol';

interface QuickRefuelWidgetProps {
    currency: string;
    lastOdometer?: number;
    lastStation?: string;
    lastFuelType?: string;
    lastVehicleName?: string;
}

export function QuickRefuelWidget({ currency, lastOdometer, lastStation, lastVehicleName, lastFuelType }: QuickRefuelWidgetProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { profile } = useUserProfile();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    
    // Form fields
    const [station, setStation] = useState(lastStation || '');
    const [odometer, setOdometer] = useState<string>('');
    const [liters, setLiters] = useState<string>('');
    const [price, setPrice] = useState<string>('');

    const isProPlus = profile?.plan === 'pro-plus';

    const handleSave = async () => {
        if (!user || !firestore) return;
        if (!liters || !price || parseFloat(liters) <= 0 || parseFloat(price) <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Entry', description: 'Liters and price are required.' });
            return;
        }

        setIsLoading(true);
        const l = parseFloat(liters);
        const p = parseFloat(price);
        const odo = odometer ? parseFloat(odometer) : undefined;
        
        const expenseData = {
            userId: user.uid,
            amount: parseFloat((l * p).toFixed(2)),
            currency,
            date: new Date(),
            category: 'Fuel',
            description: `Refuel at ${station || 'Station'}`,
            context: isProPlus ? 'business' : 'personal',
            fuelLiters: l,
            fuelPricePerUnit: p,
            station: station || 'Unknown Station',
            odometer: odo,
            fuelVehicleName: lastVehicleName || 'Primary Vehicle',
            fuelIsFullTank: true,
            fuelType: lastFuelType || 'Petrol'
        };

        try {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'expenses'), expenseData);
            toast({ title: 'Refuel Logged', description: 'Your telematics have been updated.' });
            setStation('');
            setOdometer('');
            setLiters('');
            setPrice('');
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error logging refuel' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="glass-card shadow-premium border-primary/20 overflow-hidden relative group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform pointer-events-none">
                <Zap className="h-24 w-24 text-primary" />
            </div>
            <CardHeader className="pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                    <Fuel className="h-4 w-4" />
                    Quick Log Refuel
                </CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-tight text-muted-foreground/60">
                    Bypass dialog to instantly log telematics
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Odometer (km)</label>
                        <div className="relative">
                            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input 
                                type="number" 
                                placeholder={lastOdometer ? `>${lastOdometer.toLocaleString()}` : "Current km"} 
                                value={odometer} 
                                onChange={e => setOdometer(e.target.value)}
                                className="pl-8 h-10 text-sm glass-card"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Station</label>
                        <div className="relative">
                            <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input 
                                placeholder={lastStation || "Station Name"} 
                                value={station} 
                                onChange={e => setStation(e.target.value)}
                                className="pl-8 h-10 text-sm glass-card"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Liters Filled</label>
                        <Input 
                            type="number" step="0.01" placeholder="0.00" 
                            value={liters} 
                            onChange={e => setLiters(e.target.value)}
                            className="h-10 text-sm glass-card border-emerald-500/30"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex justify-between">
                            <span>Price / Liter</span>
                            <CurrencyIcon currency={currency} className="h-2.5 w-2.5 opacity-50" />
                        </label>
                        <Input 
                            type="number" step="0.01" placeholder="0.00" 
                            value={price} 
                            onChange={e => setPrice(e.target.value)}
                            className="h-10 text-sm glass-card border-primary/30"
                        />
                    </div>
                </div>
                
                <Button 
                    onClick={handleSave} 
                    disabled={isLoading || !liters || !price} 
                    className="w-full bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20 hover:shadow-primary/40 h-11"
                >
                    {isLoading ? 'Logging...' : 'Log Fast Entry'}
                </Button>
            </CardContent>
        </Card>
    );
}
