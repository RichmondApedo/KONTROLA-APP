import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    { value: "zar", label: "ZAR - South African Rand (R)" }
];


export default function SettingsPage() {
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
                        <Input id="name" defaultValue="Current User" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue="user@example.com" disabled />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Preferences</CardTitle>
                    <CardDescription>Customize your KONTROLA experience.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="language">Language</Label>
                        <Select defaultValue="en">
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
                        <Select defaultValue="usd">
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
                </CardContent>
            </Card>

             <div className="flex justify-end">
                <Button>Save Changes</Button>
            </div>
        </div>
    );
}
