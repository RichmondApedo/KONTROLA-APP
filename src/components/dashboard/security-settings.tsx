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
    const [isLoading, setIsLoading] = useState(false);

    const isMfaEnabled = profile?.mfaEnabled || false;
    const securityScore = isMfaEnabled ? 100 : 45;

    const handleToggleMfa = () => {
        if (isMfaEnabled) {
            // In a real production app, we would require a verification step here too.
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

                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                        <span>Security Health Score</span>
                        <span className={isMfaEnabled ? "text-emerald-600" : "text-amber-600"}>{securityScore}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 ease-out rounded-full ${isMfaEnabled ? "bg-emerald-500" : "bg-amber-500"}`} 
                            style={{ width: `${securityScore}%` }}
                        />
                    </div>
                </div>

                {!isMfaEnabled && (
                    <div className="p-4 rounded-xl bg-amber-500/[0.03] border border-amber-500/10 space-y-2">
                        <div className="flex items-center gap-2 text-amber-600">
                            <ShieldAlert className="h-4 w-4" />
                            <p className="text-xs font-black uppercase tracking-widest">Vulnerability Alert</p>
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
