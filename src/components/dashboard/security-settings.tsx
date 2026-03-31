'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useUserProfile } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, ShieldAlert, Loader2, Smartphone, Key } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function SecuritySettings() {
    const { user } = useUser();
    const { profile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isEnrolling, setIsEnrolling] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '');
    const [verificationCode, setVerificationCode] = useState('');
    const [enrollmentStep, setEnrollmentStep] = useState<'phone' | 'otp'>('phone');
    const [isLoading, setIsLoading] = useState(false);

    const isMfaEnabled = profile?.mfaEnabled || false;

    const handleToggleMfa = () => {
        if (isMfaEnabled) {
            if (user && firestore) {
                setIsLoading(true);
                const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
                setDocumentNonBlocking(profileRef, { mfaEnabled: false }, { merge: true });
                toast({
                    title: "2FA Disabled",
                    description: "Multi-factor authentication has been turned off.",
                });
                setIsLoading(false);
            }
        } else {
            setIsEnrolling(true);
            setEnrollmentStep('phone');
        }
    };

    const handleStartEnrollment = () => {
        if (!phoneNumber) {
            toast({ variant: "destructive", title: "Error", description: "Please enter a valid phone number." });
            return;
        }
        setIsLoading(true);
        // Simulate sending SMS
        setTimeout(() => {
            setEnrollmentStep('otp');
            setIsLoading(false);
            toast({
                title: "Code Sent",
                description: "A secure 6-digit code has been sent to your device (Simulation).",
            });
        }, 1500);
    };

    const handleVerifyOtp = () => {
        if (verificationCode.length !== 6) {
            toast({ variant: "destructive", title: "Invalid Code", description: "Please enter the 6-digit code sent to your device." });
            return;
        }

        setIsLoading(true);
        if (user && firestore) {
            const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
            setDocumentNonBlocking(profileRef, { 
                mfaEnabled: true,
                phone: phoneNumber 
            }, { merge: true });

            setTimeout(() => {
                setIsEnrolling(false);
                setIsLoading(false);
                toast({
                    title: "Security Activated",
                    description: "Your account is now protected with 2FA.",
                });
            }, 1000);
        }
    };

    return (
        <Card className="border-emerald-500/10 bg-emerald-500/[0.01]">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            Security & Access
                            {isMfaEnabled ? (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">Protected</Badge>
                            ) : (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-black uppercase tracking-widest">Action Required</Badge>
                            )}
                        </CardTitle>
                        <CardDescription>Secure your account with multi-factor authentication.</CardDescription>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <Key className="h-6 w-6 text-emerald-500" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl border bg-background/50">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Smartphone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">SMS Authentication</p>
                            <p className="text-xs text-muted-foreground">Receive a secure code via text message when you sign in.</p>
                        </div>
                    </div>
                    <Button 
                        variant={isMfaEnabled ? "outline" : "default"} 
                        size="sm"
                        onClick={handleToggleMfa}
                        disabled={isLoading}
                        className={!isMfaEnabled ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isMfaEnabled ? 'Disable' : 'Enable Setup')}
                    </Button>
                </div>

                {isEnrolling && !isMfaEnabled && (
                    <div className="p-5 rounded-2xl border border-primary/20 bg-primary/[0.02] animate-in zoom-in-95 duration-300 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest">Enrollment Step {enrollmentStep === 'phone' ? '1' : '2'}</Badge>
                        </div>
                        
                        {enrollmentStep === 'phone' ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mfa-phone" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mobile Phone Number</Label>
                                    <Input 
                                        id="mfa-phone" 
                                        placeholder="+233 XXX XXX XXX" 
                                        value={phoneNumber} 
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="bg-background/50"
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Standard SMS rates may apply. Kontrola will send a one-time code to this number.</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleStartEnrollment} disabled={isLoading} className="flex-1">
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Verification Code'}
                                    </Button>
                                    <Button variant="ghost" onClick={() => setIsEnrolling(false)} disabled={isLoading}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mfa-otp" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Verification Code</Label>
                                    <Input 
                                        id="mfa-otp" 
                                        placeholder="Enter 6-digit code" 
                                        maxLength={6}
                                        value={verificationCode} 
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        className="text-center text-lg tracking-[0.5em] font-mono bg-background/50"
                                    />
                                    <p className="text-[10px] text-center text-muted-foreground">Code sent to {phoneNumber}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleVerifyOtp} disabled={isLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Enable'}
                                    </Button>
                                    <Button variant="ghost" onClick={() => setEnrollmentStep('phone')} disabled={isLoading}>Back</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {!isMfaEnabled && (
                    <div className="p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-600">
                            <ShieldCheck className="h-4 w-4" />
                            <p className="text-xs font-black uppercase tracking-widest">Double protect your account</p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Your account is currently protected by a single password factor. Enabling SMS 2FA creates a secondary wall against unauthorized access and account takeovers.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
