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
    const { profile } = useUserProfile();

    return (
        <Card className="border-emerald-500/10 bg-emerald-500/[0.01]">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            Security & Access
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">Active</Badge>
                        </CardTitle>
                        <CardDescription>Advanced account protection and identity verification.</CardDescription>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <Key className="h-6 w-6 text-emerald-500" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl border bg-background/50 opacity-60 grayscale-[0.5]">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-muted-foreground">Multi-Factor Authentication</p>
                            <p className="text-xs text-muted-foreground">This feature is currently being recalibrated for maximum security.</p>
                        </div>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm"
                        disabled
                        className="text-[10px] font-black uppercase tracking-widest"
                    >
                        Coming Soon
                    </Button>
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600">
                        <ShieldCheck className="h-4 w-4" />
                        <p className="text-xs font-black uppercase tracking-widest leading-none">Standard Protection Active</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Your account is currently protected by KONTROLA primary authentication and real-time session monitoring. Advanced MFA options will be available in the next security rollout.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
