'use client';

import { useState } from 'react';
import { useFirestore, useUser, useUserProfile } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Briefcase, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const UpgradePlanDialog = dynamic(() => import('@/components/dashboard/upgrade-plan-dialog').then(mod => mod.UpgradePlanDialog));

const currencies = [
    { value: "ghs", label: "GHS - Ghanaian Cedi (GH₵)" },
    { value: "usd", label: "USD - United States Dollar ($)" },
    { value: "eur", label: "EUR - Euro (€)" },
    { value: "gbp", label: "GBP - British Pound Sterling (£)" },
];

export function CreateEnterpriseDialog() {
    const { user } = useUser();
    const { switchProfile, profile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [businessName, setBusinessName] = useState('');
    const [currency, setCurrency] = useState('ghs');

    const handleCreateTerminal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore || !businessName) return;

        // Check plan quota - robust check (handles variations like 'pro-plus', 'Pro Plus', 'pro_plus')
        const normalizedPlan = profile?.plan?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'free';
        const isProPlus = normalizedPlan === 'proplus';

        if (!isProPlus) {
            toast({
                variant: 'destructive',
                title: 'Upgrade Required',
                description: 'The Multi-Account Manager is a Pro Plus feature. Please upgrade your plan to add additional business accounts.',
            });
            return;
        }

        setIsCreating(true);
        try {
            // 1. Generate Virtual ID
            const vbusId = `vbus_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
            
            // 2. Create the Profile Document
            const profileRef = doc(firestore, 'users', vbusId, 'profile', vbusId);
            await setDoc(profileRef, {
                id: vbusId,
                ownerUid: user.uid,
                businessName: businessName,
                preferredCurrency: currency,
                preferredLanguage: 'en',
                plan: 'pro-plus', // Inherited level for the enterprise
                role: 'user',
                subscriptionStatus: 'active',
                createdAt: serverTimestamp(),
            });

            // 3. Create the Access Grant for the creator
            const grantId = `${vbusId}_${user.uid}`;
            await setDoc(doc(firestore, 'business_access_grants', grantId), {
                id: grantId,
                ownerUid: vbusId,
                ownerEmail: businessName, // Using the business name as the label
                targetUid: user.uid,
                targetEmail: user.email?.toLowerCase(),
                accessLevel: 'owner',
                grantedAt: serverTimestamp(),
            });

            toast({
                title: "Business Account Created!",
                description: `"${businessName}" is now ready in your Command Hub.`,
            });

            // 4. Switch to the new terminal
            switchProfile(vbusId, 'owner');
            setIsOpen(false);
            setBusinessName('');
            
        } catch (error: any) {
            console.error("Failed to spawn enterprise:", error);
            
            let errorMessage = "An unexpected error occurred while initializing your new workspace. Please ensure you have a stable connection and active Pro Plus status.";
            
            if (error.code === 'permission-denied') {
                errorMessage = "Access Denied: You must have an active 'Pro Plus' subscription to launch secondary business accounts.";
            } else if (error.code === 'unavailable') {
                errorMessage = "Network issue detected. Please check your connection and try again.";
            }

            toast({
                variant: 'destructive',
                title: 'Initialization Failed',
                description: errorMessage,
            });
        } finally {
            setIsCreating(false);
        }
    };

    const normalizedPlan = profile?.plan?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'free';
    const isProPlus = normalizedPlan === 'proplus' || profile?.role === 'admin';

    if (!isProPlus) {
        return (
            <UpgradePlanDialog featureName="Multi-Account Manager">
                <Button className="rounded-2xl bg-primary/50 shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px] h-11 px-6 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Business Account
                </Button>
            </UpgradePlanDialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="rounded-2xl bg-primary shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px] h-11 px-6 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Business Account
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border-primary/20 shadow-premium">
                <form onSubmit={handleCreateTerminal}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Business Account Manager
                        </DialogTitle>
                        <DialogDescription className="text-xs font-medium">
                            Create a new isolated business account to manage your company operations separately.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="vbus-name" className="text-[10px] font-black uppercase tracking-widest opacity-60">Legal Business Name</Label>
                            <Input
                                id="vbus-name"
                                placeholder="e.g. Skyline Logistics"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                className="rounded-xl bg-muted/50 border-border/40 h-11"
                                required
                                disabled={isCreating}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vbus-currency" className="text-[10px] font-black uppercase tracking-widest opacity-60">Base Currency</Label>
                            <Select value={currency} onValueChange={setCurrency} disabled={isCreating}>
                                <SelectTrigger id="vbus-currency" className="rounded-xl bg-muted/50 border-border/40 h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {currencies.map(c => (
                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[9px] text-muted-foreground font-medium pl-1 italic">
                                Note: This cannot be changed easily later.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            type="submit" 
                            disabled={isCreating || !businessName}
                            className="w-full bg-primary font-black uppercase tracking-widest text-xs h-12 rounded-xl"
                        >
                            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Briefcase className="mr-2 h-4 w-4" />}
                            Create Account
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
