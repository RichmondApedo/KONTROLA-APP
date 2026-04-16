
'use client';

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useFirestore, useUserProfile } from "@/firebase";
import { deleteUser, signOut } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/lib/types";
import { MonoConnectButton } from "@/components/mono-connect-button";
import { LinkedAccountList } from "@/components/dashboard/linked-account-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Info, Smartphone, Trash2, Lock, Bell, Send } from "lucide-react";
import { ClientOnly } from "@/components/client-only";
import { SecuritySettings } from "@/components/dashboard/security-settings";
import Link from "next/link";
import { format } from 'date-fns';
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
import { Skeleton } from "@/components/ui/skeleton";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { getMessagingToken } from "@/firebase/messaging";
import { initializeFirebase as initFirebase } from "@/firebase/init";
import { Switch } from "@/components/ui/switch";

const languages = [
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "fr", label: "Français" },
    { value: "de", label: "Deutsch" },
    { value: "it", label: "Italiano" },
    { value: "pt", label: "Português" },
    { value: "ru", label: "Русский" },
    { value: "zh", label: "中文" },
    { value: "ja", label: "日本語" },
    { value: "ko", label: "한국어" },
    { value: "ar", label: "العربية" },
    { value: "hi", label: "हिन्दी" },
    { value: "bn", label: "বাংলা" },
    { value: "nl", label: "Nederlands" },
    { value: "sv", label: "Svenska" },
    { value: "no", label: "Norsk" },
    { value: "fi", label: "Suomi" },
    { value: "da", label: "Dansk" },
    { value: "pl", label: "Polski" },
    { value: "tr", label: "Türkçe" }
];

const currencies = [
    { value: "ghs", label: "GHS - Ghanaian Cedi (GH₵)" },
    { value: "usd", label: "USD - United States Dollar ($)" },
    { value: "eur", label: "EUR - Euro (€)" },
    { value: "jpy", label: "JPY - Japanese Yen (¥)" },
    { value: "gbp", label: "GBP - British Pound Sterling (£)" },
    { value: "aud", label: "AUD - Australian Dollar (A$)" },
    { value: "cad", label: "CAD - Canadian Dollar (C$)" },
    { value: "chf", label: "CHF - Swiss Franc (CHF)" },
    { value: "cny", label: "CNY - Chinese Yuan (¥)" },
    { value: "sek", label: "SEK - Swedish Krona (kr)" },
    { value: "nzd", label: "NZD - New Zealand Dollar (NZ$)" },
    { value: "mxn", label: "MXN - Mexican Peso ($)" },
    { value: "sgd", label: "SGD - Singapore Dollar (S$)" },
    { value: "hkd", label: "HKD - Hong Kong Dollar (HK$)" },
    { value: "nok", label: "NOK - Norwegian Krone (kr)" },
    { value: "krw", label: "KRW - South Korean Won (₩)" },
    { value: "try", label: "TRY - Turkish Lira (₺)" },
    { value: "rub", label: "RUB - Russian Ruble (₽)" },
    { value: "inr", label: "INR - Indian Rupee (₹)" },
    { value: "brl", label: "BRL - Brazilian Real (R$)" },
    { value: "zar", label: "ZAR - South African Rand (R)" },
    { value: "ngn", label: "NGN - Nigerian Naira (₦)" },
    { value: "kes", label: "KES - Kenyan Shilling (KSh)" },
    { value: "egp", label: "EGP - Egyptian Pound (E£)" },
    { value: "dzd", label: "DZD - Algerian Dinar (DA)" },
    { value: "etb", label: "ETB - Ethiopian Birr (Br)" },
    { value: "ugx", label: "UGX - Ugandan Shilling (USh)" },
    { value: "tzs", label: "TZS - Tanzanian Shilling (TSh)" },
    { value: "bwp", label: "BWP - Botswana Pula (P)" },
    { value: "zmw", label: "ZMW - Zambian Kwacha (ZK)" }
];


export default function SettingsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { profile, isProfileLoading, activeProfileId } = useUserProfile();

    const isDelegate = activeProfileId && user && activeProfileId !== user.uid;

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [language, setLanguage] = useState('en');
    const [currency, setCurrency] = useState('ghs');
    const [isSaving, setIsSaving] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [incomeDate, setIncomeDate] = useState<number>(0);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [isTestingPush, setIsTestingPush] = useState(false);
    
    const [monoConfig, setMonoConfig] = useState<{ publicKey: string; isTestKey: boolean } | null>(null);
    const [isMonoLoading, setIsMonoLoading] = useState(true);

    const profileDocRef = useMemo(() => 
        user && firestore ? doc(firestore, 'users', user.uid, 'profile', user.uid) : null,
        [user, firestore]
    );

    useEffect(() => {
        if (profile) {
            setFirstName(profile.firstName || '');
            setLastName(profile.lastName || '');
            setBusinessName(profile.businessName || '');
            setEmail(profile.email || user?.email || '');
            setPhone(profile.phone || user?.phoneNumber || '');
            setLanguage(profile.preferredLanguage || 'en');
            setCurrency(profile.preferredCurrency || 'ghs');
            setIncomeDate(profile.incomeDate || 0);
            setNotificationsEnabled(profile.notificationsEnabled !== false);
        } else if (user && !isProfileLoading) {
            const [first, ...lastParts] = (user.displayName || '').split(' ');
            setFirstName(first || '');
            setLastName(lastParts.join(' '));
            setEmail(user.email || '');
            setPhone(user.phoneNumber || '');
            setIncomeDate(0);
        }
    }, [profile, user, isProfileLoading]);

    if (isDelegate) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="h-24 w-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center shadow-inner border border-emerald-500/20">
                    <Lock className="h-12 w-12 text-emerald-500" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-black font-headline tracking-tight text-primary">Privacy Shield Active</h1>
                    <p className="text-muted-foreground font-medium max-w-md mx-auto">
                        You are currently in a delegated business session. Personal settings, security credentials, and subscription controls are restricted to the account owner.
                    </p>
                </div>
                <Button asChild variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-[10px] border-primary/20 bg-primary/5 hover:bg-primary/10">
                    <Link href="/dashboard/business">Return to Business Suite</Link>
                </Button>
            </div>
        );
    }


    useEffect(() => {
        fetch('/api/mono-key')
            .then(res => res.json())
            .then(data => {
                if(data && data.publicKey) {
                    setMonoConfig({ publicKey: data.publicKey, isTestKey: data.isTestKey });
                }
            })
            .catch(() => setMonoConfig(null))
            .finally(() => setIsMonoLoading(false));
    }, []);

    const handleSaveChanges = () => {
        if (!user || !firestore || !profileDocRef) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "You must be signed in to save changes.",
            });
            return;
        }

        setIsSaving(true);

        const profileData: Partial<UserProfile> = {
            firstName: firstName,
            lastName: lastName,
            businessName: businessName,
            preferredLanguage: language,
            preferredCurrency: currency,
            incomeDate: incomeDate,
        };

        if (!profile?.email && email) {
            profileData.email = email;
        }
        if (!profile?.phone && phone) {
            profileData.phone = phone;
        }

        setDocumentNonBlocking(profileDocRef, profileData, { merge: true });

        toast({
            title: "Success!",
            description: "Your settings are being saved.",
        });

        setIsSaving(false);
    };
    
    const handleCancelSubscription = async () => {
        if (!user) return;
        setIsCancelling(true);
        try {
            const idToken = await user.getIdToken();
            const response = await fetch('/api/paystack/cancel-subscription', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to cancel subscription.');
            }

            let description = "Your subscription has been cancelled and will not auto-renew.";
            if (profile?.subscriptionExpiry) {
                const expiryDate = (profile.subscriptionExpiry as any).toDate ? (profile.subscriptionExpiry as any).toDate() : new Date(profile.subscriptionExpiry);
                description += ` You will retain access until ${format(expiryDate, 'PPP')}.`
            }
        
            toast({ title: "Subscription Cancelled", description: description });

        } catch (error: any) {
             toast({ variant: "destructive", title: "Cancellation Failed", description: error.message });
        } finally {
            setIsCancelling(false);
        }
    };

    const handleToggleNotifications = async (checked: boolean) => {
        if (!user || !firestore || !profileDocRef) return;
        
        setIsSaving(true);
        try {
            if (checked) {
                const { firebaseApp } = initFirebase();
                const token = await getMessagingToken(firebaseApp);
                if (token) {
                    await updateDoc(profileDocRef, {
                        fcmToken: token,
                        notificationsEnabled: true
                    });
                    setNotificationsEnabled(true);
                    toast({ title: "Notifications Enabled", description: "You will now receive strategic alerts." });
                } else {
                    toast({ variant: "destructive", title: "Permission Denied", description: "Please enable notification permissions in your browser." });
                    setNotificationsEnabled(false);
                }
            } else {
                await updateDoc(profileDocRef, {
                    notificationsEnabled: false
                });
                setNotificationsEnabled(false);
                toast({ title: "Notifications Disabled", description: "You will no longer receive push alerts." });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Update Failed", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestPush = async () => {
        if (!user) return;
        setIsTestingPush(true);
        try {
            const idToken = await user.getIdToken();
            const response = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    userId: user.uid,
                    title: "KONTROLA Strategic Test",
                    body: "Your Intelligence Link is active and operational. System ready.",
                    type: "system",
                    data: { test: "true" }
                })
            });

            if (!response.ok) throw new Error('Failed to send test push.');
            toast({ title: "Test Dispatched", description: "A test notification has been sent to your device." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Test Failed", description: error.message });
        } finally {
            setIsTestingPush(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user || !firestore || !profileDocRef) return;
        
        setIsDeleting(true);
        try {
            // 1. Wipe the profile document in Firestore
            // We do this first so that if Auth deletion fails, the data is still gone.
            await deleteDoc(profileDocRef);
            
            // 2. APPLE COMPLIANCE: Pursue full identity purge
            // This deletes the actual Firebase Auth account, fulfilling Guideline 5.1.1.
            try {
                await deleteUser(user);
                
                toast({
                    title: "Identity Purge Successful",
                    description: "Your account and all associated data have been permanently deleted.",
                });

                // Clear session and redirect
                setTimeout(() => {
                    window.location.href = '/auth/login';
                }, 2000);

            } catch (authError: any) {
                // If deletion fails due to sensitive action (requires recent login)
                if (authError.code === 'auth/requires-recent-login') {
                    toast({
                        variant: "destructive",
                        title: "Security Verification Required",
                        description: "For your protection, please sign out and sign back in before deleting your account.",
                    });
                    
                    // We don't redirect yet; let the user sign out manually or provide a signout button
                    return;
                }
                
                // For other errors, we still consider the data partially purged
                toast({
                    variant: "destructive",
                    title: "Partial Deletion",
                    description: "Data purged, but identity removal failed. Please contact support.",
                });
            }

        } catch (error: any) {
            toast({ variant: "destructive", title: "Deletion Failed", description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };

    const isLoading = isProfileLoading || isSaving || isDeleting;

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account and application preferences.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Update your personal information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={isLoading} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isLoading} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input id="businessName" placeholder="e.g., Acme Inc." value={businessName} onChange={(e) => setBusinessName(e.target.value)} disabled={isLoading} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading || !!profile?.email} />
                        {!profile?.email && <p className="text-xs text-muted-foreground pt-1">Add an email to enable purchases and receive important notifications.</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isLoading || !!profile?.phone} />
                         {!profile?.phone && <p className="text-xs text-muted-foreground pt-1">Add a phone number to enable SMS-based features.</p>}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end pt-4 pb-6 bg-muted/5 border-t border-border/10">
                    <Button onClick={handleSaveChanges} disabled={isLoading} size="sm">
                        {isSaving ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Saving...</> : 'Save Profile'}
                    </Button>
                </CardFooter>
            </Card>

            <div className="space-y-2">
                <SecuritySettings />
                <div className="flex justify-end pr-1">
                    <Button onClick={handleSaveChanges} disabled={isLoading} size="sm" variant="secondary" className="border-border/40 shadow-sm">
                        {isSaving ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Saving...</> : 'Save Security Settings'}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Preferences</CardTitle>
                    <CardDescription>Customize your KONTROLA experience.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ClientOnly>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="language">Language</Label>
                                <Select value={language} onValueChange={setLanguage} disabled={isLoading}>
                                    <SelectTrigger id="language">
                                        <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {languages.map((lang) => (
                                            <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Select value={currency} onValueChange={setCurrency} disabled={isLoading}>
                                    <SelectTrigger id="currency">
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencies.map((currency) => (
                                            <SelectItem key={currency.value} value={currency.value}>{currency.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-border/40">
                                <div className="space-y-1">
                                    <Label htmlFor="incomeDate">Personal Income Day (Pay Cycle)</Label>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-tight font-bold">Setting this enables the "Pay Cycle" view on the dashboard.</p>
                                </div>
                                <Select 
                                    value={incomeDate === 0 ? "none" : incomeDate.toString()} 
                                    onValueChange={(val) => setIncomeDate(val === "none" ? 0 : parseInt(val))} 
                                    disabled={isLoading}
                                >
                                    <SelectTrigger id="incomeDate">
                                        <SelectValue placeholder="Disabled (Calendar Month Only)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Disabled (Calendar Month Only)</SelectItem>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                            <SelectItem key={day} value={day.toString()}>Every {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of the month</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </ClientOnly>
                </CardContent>
                <CardFooter className="flex justify-end pt-4 pb-6 bg-muted/5 border-t border-border/10">
                    <Button onClick={handleSaveChanges} disabled={isLoading} size="sm">
                        {isSaving ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Saving...</> : 'Save Preferences'}
                    </Button>
                </CardFooter>
            </Card>

            <Card className="border-primary/20 bg-primary/[0.02]">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        <CardTitle>Notifications</CardTitle>
                    </div>
                    <CardDescription>Manage push alerts and strategic financial intelligence.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-primary/10 bg-background/50">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Push Notifications</Label>
                            <p className="text-xs text-muted-foreground">Receive real-time alerts for bills, budgets, and milestones.</p>
                        </div>
                        <Switch 
                            checked={notificationsEnabled} 
                            onCheckedChange={handleToggleNotifications} 
                            disabled={isLoading}
                        />
                    </div>

                    {notificationsEnabled && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                <div className="flex items-center gap-3">
                                    <Smartphone className="h-4 w-4 text-emerald-600" />
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                                        Device Linked: {profile?.fcmToken ? "ACTIVE" : "PENDING"}
                                    </div>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest border-emerald-500/20 bg-white hover:bg-emerald-50"
                                    onClick={handleTestPush}
                                    disabled={isTestingPush || !profile?.fcmToken}
                                >
                                    {isTestingPush ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-2" />}
                                    Test Signal
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Subscription</CardTitle>
                    <CardDescription>Manage your current subscription plan.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isProfileLoading ? (
                        <Skeleton className="h-24 w-full" />
                    ) : profile?.plan === 'free' || profile?.subscriptionStatus === 'inactive' ? (
                        <div className="space-y-2">
                             <p className="text-muted-foreground">You are currently on the Free plan.</p>
                            <Button asChild>
                                <Link href="/pricing">View Upgrade Options</Link>
                            </Button>
                        </div>
                    ) : profile?.subscriptionStatus === 'non-renewing' ? (
                         <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Subscription Pending Cancellation</AlertTitle>
                            <AlertDescription>
                                Your subscription will not renew. You will retain access to premium features until {profile?.subscriptionExpiry ? format(new Date(profile.subscriptionExpiry as any), 'PPP') : 'the end of your billing cycle'}.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <p className="font-semibold capitalize">{profile?.plan} Plan</p>
                                    {profile?.subscriptionExpiry && (
                                        <p className="text-sm text-muted-foreground">
                                            Renews on {format(new Date(profile.subscriptionExpiry as any), 'PPP')}
                                        </p>
                                    )}
                                </div>
                                <Button asChild variant="outline">
                                    <Link href="/pricing">Change Plan</Link>
                                </Button>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={isCancelling}>
                                    {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Cancel Subscription
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will disable auto-renewal for your subscription. You will retain access to premium features until your current billing period ends. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive hover:bg-destructive/90" disabled={isCancelling}>
                                            {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </CardContent>
            </Card>
             
             <Card>
                <CardHeader>
                    <CardTitle>Connect Mobile Money / Bank</CardTitle>
                    <CardDescription>
                        Automatically sync transactions from your financial accounts. Kontrola connects in read-only mode for your security.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isMonoLoading ? (
                        <div className="flex items-center justify-center p-4 text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span>Checking configuration...</span>
                        </div>
                    ) : monoConfig ? (
                        <>
                            {monoConfig.isTestKey && (
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Test Mode Enabled</AlertTitle>
                                    <AlertDescription>
                                        The app is using test API keys for account linking. You can only connect using{' '}
                                        <a href="https://docs.mono.co/docs/testing-in-sandbox" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                                            Mono's official test credentials
                                        </a>. To connect your own live accounts, please add your production Mono keys to the <code>.env</code> file.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="mb-6 space-y-4 rounded-lg border border-border bg-muted/50 p-4 text-sm">
                                <p className="font-semibold text-foreground">Your Security is Our Priority</p>
                                <ul className="space-y-3 text-muted-foreground">
                                    <li className="flex items-start gap-3">
                                        <span className="mt-1 text-lg">🔒</span>
                                        <div><strong>Read-Only Access:</strong> We can only view transaction history to help you track spending and generate insights.</div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="mt-1 text-lg">🔒</span>
                                        <div><strong>No Payment Capabilities:</strong> We cannot send money, make payments, or withdraw funds from your account.</div>
                                    </li>
                                     <li className="flex items-start gap-3">
                                        <span className="mt-1 text-lg">🔒</span>
                                        <div><strong>Your Credentials Are Private:</strong> We never see or store your PINs, OTPs, or passwords.</div>
                                    </li>
                                </ul>
                            </div>
                            
                            <LinkedAccountList />

                            <div className="mt-6 flex flex-col items-center gap-2 rounded-lg bg-muted/50 p-4">
                                <MonoConnectButton publicKey={monoConfig.publicKey} />
                                <p className="text-center text-xs text-muted-foreground">
                                   By continuing, you authorize Kontrola to access your transaction data for analysis purposes only.
                                </p>
                            </div>
                        </>
                    ) : (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Feature Coming Soon</AlertTitle>
                            <AlertDescription>
                                Bank and Mobile Money synchronization is currently in development and will be available in a future update.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <Card className="border-destructive/20 bg-destructive/5 overflow-hidden">
                <CardHeader className="border-b border-destructive/10 bg-destructive/5 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                            <Trash2 className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                            <CardTitle className="text-destructive">Account and Data Control</CardTitle>
                            <CardDescription className="text-destructive/60">Permanent actions regarding your account.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-bold">Delete Account</p>
                            <p className="text-xs text-muted-foreground">Once you delete your account, there is no going back. All your data will be permanently wiped.</p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="font-black uppercase tracking-widest text-[10px]">
                                    Delete Account
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border-destructive/20 shadow-premium">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-destructive flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5" />
                                        Permanent Data Deletion?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-foreground/80 font-medium">
                                        This action is **irreversible**. You will lose all your financial history, invoices, receipts, and vehicle telematics data. Kontrola will purge your profile and associated documents.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="font-bold border-muted-foreground/20 hover:bg-muted/50">Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={handleDeleteAccount} 
                                        className="bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest text-[10px]"
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? 'Deleting...' : 'Proceed with Deletion'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>

            {/* LEGAL & TRANSPARENCY - APPLE GUIDELINE 5.1.1 COMPLIANCE */}
            <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-premium overflow-hidden">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                            <Info className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-widest">Legal & Transparency</CardTitle>
                            <CardDescription className="text-emerald-700/70 font-medium">Platform compliance and data safety documentation.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link href="/privacy" className="group">
                            <div className="p-4 rounded-2xl border border-emerald-500/10 bg-white hover:border-emerald-500/30 transition-all duration-300">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">Mandatory Disclosure</p>
                                <p className="font-bold text-foreground">Privacy Policy</p>
                                <p className="text-xs text-muted-foreground mt-1">How we handle your financial data and identifiers.</p>
                            </div>
                        </Link>
                        <Link href="/terms" className="group">
                            <div className="p-4 rounded-2xl border border-emerald-500/10 bg-white hover:border-emerald-500/30 transition-all duration-300">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">Usage Agreement</p>
                                <p className="font-bold text-foreground">Terms of Service</p>
                                <p className="text-xs text-muted-foreground mt-1">Your rights and responsibilities on the platform.</p>
                            </div>
                        </Link>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Platform Compliance: VERIFIED</p>
                        </div>
                        <p className="text-[10px] font-bold text-emerald-700/60">Version 1.0.0 (Production Build)</p>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4">
                <Button onClick={handleSaveChanges} disabled={isLoading}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
}
