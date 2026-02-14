'use client';

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/lib/types";
import { MonoConnectButton } from "@/components/mono-connect-button";
import { LinkedAccountList } from "@/components/dashboard/linked-account-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { ClientOnly } from "@/components/client-only";

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
    { value: "ghs", label: "GHS - Ghanaian Cedi (GH₵)" },
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

    const [name, setName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [language, setLanguage] = useState('en');
    const [currency, setCurrency] = useState('usd');
    const [isSaving, setIsSaving] = useState(false);
    
    const [monoConfig, setMonoConfig] = useState<{ publicKey: string; isTestKey: boolean } | null>(null);
    const [isMonoLoading, setIsMonoLoading] = useState(true);

    const profileDocRef = useMemo(() => 
        user && firestore ? doc(firestore, 'users', user.uid, 'profile', user.uid) : null,
        [user, firestore]
    );

    const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);

    useEffect(() => {
        if (profile) {
            setName(`${profile.firstName || ''} ${profile.lastName || ''}`.trim());
            setBusinessName(profile.businessName || '');
            setLanguage(profile.preferredLanguage || 'en');
            setCurrency(profile.preferredCurrency || 'usd');
        } else if (user && !isProfileLoading) {
            setName(user.displayName || '');
        }
    }, [profile, user, isProfileLoading]);


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

    const handleSaveChanges = async () => {
        if (!user || !firestore || !profileDocRef) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "You must be signed in to save changes.",
            });
            return;
        }

        setIsSaving(true);
        const [firstName, ...lastNameParts] = name.split(' ');
        const lastName = lastNameParts.join(' ');

        const profileData = {
            id: user.uid, // Required for creation rule
            email: user.email, // Required for creation
            firstName: firstName || '',
            lastName: lastName || '',
            businessName: businessName,
            preferredLanguage: language,
            preferredCurrency: currency,
            plan: profile?.plan || 'free',
            points: profile?.points || 0,
        };

        try {
            await setDoc(profileDocRef, profileData, { merge: true });
            toast({
                title: "Success!",
                description: "Your settings have been saved.",
            });

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: "Could not save your settings. Please try again.",
            });
            console.error("Error saving settings: ", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const isLoading = isProfileLoading || isSaving;

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
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input id="businessName" placeholder="e.g., Acme Inc." value={businessName} onChange={(e) => setBusinessName(e.target.value)} disabled={isLoading} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={user?.email || ''} disabled />
                    </div>
                </CardContent>
            </Card>

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
                        </div>
                    </ClientOnly>
                </CardContent>
            </Card>
            
             <Card>
                <CardHeader>
                    <CardTitle>Connect Mobile Money / Bank</CardTitle>
                    <CardDescription>
                        Kontrola connects to your Mobile Money or Bank account in read-only mode to help you track spending and generate insights.
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
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Feature Not Configured</AlertTitle>
                            <AlertDescription>
                                The account linking feature is not available. To enable it, please provide your Mono API keys in the <code>.env</code> file and restart the application.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

             <div className="flex justify-end">
                <Button onClick={handleSaveChanges} disabled={isLoading}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
}
