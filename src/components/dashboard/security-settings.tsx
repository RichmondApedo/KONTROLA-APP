'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useUserProfile, useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, ShieldAlert, Loader2, Smartphone, Key } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { multiFactor, PhoneAuthProvider, PhoneMultiFactorGenerator, RecaptchaVerifier } from '@/firebase/auth';

export function SecuritySettings() {
    const { user } = useUser();
    const { profile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isEnrolling, setIsEnrolling] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [enrollmentStep, setEnrollmentStep] = useState<'info' | 'otp'>('info');
    const [isLoading, setIsLoading] = useState(false);

    const isMfaEnabled = profile?.mfaEnabled || false;
    const mfaType = profile?.mfaType || 'email';

    const handleToggleMfa = () => {
        if (isMfaEnabled) {
            if (user && firestore) {
                setIsLoading(true);
                const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
                setDocumentNonBlocking(profileRef, { mfaEnabled: false }, { merge: true });
                toast({
                    title: "Security Shield Deactivated",
                    description: "Multi-factor authentication has been turned off.",
                });
                setIsLoading(false);
            }
        } else {
            setIsEnrolling(true);
            setEnrollmentStep('info');
        }
    };

    const handleStartEnrollment = async () => {
        if (!user) return;

        setIsLoading(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/auth/mfa/send-otp', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to send verification code');
            }

            setEnrollmentStep('otp');
            toast({
                title: "Security Code Sent",
                description: `Check your registered email address for a 6-digit code.`,
            });
        } catch (error: any) {
            console.error("MFA Enrollment Error:", error);
            toast({ 
                variant: "destructive", 
                title: "Transmission Failed", 
                description: error.message 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (verificationCode.length !== 6 || !user) {
            toast({ variant: "destructive", title: "Invalid Format", description: "Please enter the 6-digit code sent to your email." });
            return;
        }

        setIsLoading(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/auth/mfa/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ code: verificationCode })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Verification failed');
            }

            toast({
                title: "Account Secured",
                description: "Email MFA is now active on your account.",
            });
            setIsEnrolling(false);
        } catch (error: any) {
            console.error("MFA Verification Error:", error);
            toast({ 
                variant: "destructive", 
                title: "Security Violation", 
                description: error.message 
            });
        } finally {
            setIsLoading(false);
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
                        <CardDescription>Secure your account with cryptographically verified multi-factor authentication.</CardDescription>
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
                            <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">Email Guard Authentication</p>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">A secure code will be sent to your verified email each session.</p>
                        </div>
                    </div>
                    <Button 
                        variant={isMfaEnabled ? "outline" : "default"} 
                        size="sm"
                        onClick={handleToggleMfa}
                        disabled={isLoading}
                        className={!isMfaEnabled ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isMfaEnabled ? 'Disable Account Shield' : 'Initialize Shield')}
                    </Button>
                </div>

                {isEnrolling && !isMfaEnabled && (
                    <div className="p-5 rounded-2xl border border-primary/20 bg-primary/[0.02] animate-in zoom-in-95 duration-300 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest">Initialization Stage {enrollmentStep === 'info' ? '1' : '2'}</Badge>
                        </div>
                        
                        {enrollmentStep === 'info' ? (
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-background/60 border text-xs leading-relaxed space-y-2">
                                    <p className="font-bold text-foreground">Prepare for Shield Initialization:</p>
                                    <p className="text-muted-foreground opacity-80">1. We will generate a unique 6-digit security code.</p>
                                    <p className="text-muted-foreground opacity-80">2. The code will be transmitted to <strong>{user?.email}</strong>.</p>
                                    <p className="text-muted-foreground opacity-80">3. You must verify the code within 5 minutes to activate protection.</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleStartEnrollment} disabled={isLoading} className="flex-1">
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Transmit Security Code'}
                                    </Button>
                                    <Button variant="ghost" onClick={() => setIsEnrolling(false)} disabled={isLoading}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mfa-otp" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Verification Ledger Code</Label>
                                    <Input 
                                        id="mfa-otp" 
                                        placeholder="0 0 0 0 0 0" 
                                        maxLength={6}
                                        value={verificationCode} 
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        className="text-center text-2xl tracking-[0.5em] font-black bg-background/50 h-14 border-primary/20 focus:border-primary/50"
                                    />
                                    <p className="text-[10px] text-center text-muted-foreground font-medium">Verify the transmission sent to your Inbox</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleVerifyOtp} disabled={isLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Activate Account Shield'}
                                    </Button>
                                    <Button variant="ghost" onClick={() => setEnrollmentStep('info')} disabled={isLoading}>Back</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {!isMfaEnabled && (
                    <div className="p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-600">
                            <ShieldCheck className="h-4 w-4" />
                            <p className="text-xs font-black uppercase tracking-widest leading-none">High-Fidelity Security Wall</p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Your terminal is currently operating under single-factor protection. Initializing the **Email Guard Shield** creates a secondary cryptographic wall against unauthorized access.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
