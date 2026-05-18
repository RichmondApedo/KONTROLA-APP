'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserProfile, useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, ShieldAlert, Loader2, Key, Copy, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SecuritySettings() {
    const auth = useAuth();
    const { profile } = useUserProfile();
    const { toast } = useToast();

    const [isProcessing, setIsProcessing] = useState(false);
    const [setupStep, setSetupStep] = useState<'idle' | 'backup_codes' | 'active'>(
        profile?.mfaEnabled ? 'active' : 'idle'
    );
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [verificationCode, setVerificationCode] = useState('');
    const [disableStep, setDisableStep] = useState<'idle' | 'confirm'>('idle');

    const handleStartSetup = async () => {
        if (!auth?.currentUser) return;
        setIsProcessing(true);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch('/api/auth/setup-mfa', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ action: 'generate_codes' })
            });
            const result = await response.json();
            if (result.success) {
                setBackupCodes(result.backupCodes);
                setSetupStep('backup_codes');
            } else {
                toast({ variant: 'destructive', title: 'Setup Error', description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Network Error', description: 'Could not contact security service.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmSetup = async () => {
        if (!auth?.currentUser) return;
        if (!verificationCode) {
            toast({ variant: 'destructive', title: 'Code Required', description: 'Please enter one of the backup codes to confirm.' });
            return;
        }
        setIsProcessing(true);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch('/api/auth/setup-mfa', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ 
                    action: 'activate',
                    code: verificationCode,
                    isBackupCode: true
                })
            });
            const result = await response.json();
            if (result.success) {
                setSetupStep('active');
                setVerificationCode('');
                toast({ title: 'MFA Activated', description: 'Your account is now protected by SecureAccess.' });
            } else {
                toast({ variant: 'destructive', title: 'Activation Failed', description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to activate security shield.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDisableMfa = async () => {
        if (!auth?.currentUser) return;
        
        if (disableStep === 'idle') {
            if (!confirm('Are you certain you want to disable MFA? Your account security will be significantly reduced.')) return;
            setIsProcessing(true);
            try {
                // 1. Dispatch MFA Code to email for challenge verification
                const idToken = await auth.currentUser.getIdToken();
                const sendRes = await fetch('/api/auth/send-mfa', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${idToken}` }
                });
                const sendResult = await sendRes.json();
                
                if (sendResult.success) {
                    setDisableStep('confirm');
                    toast({ title: 'Verification Code Dispatched', description: 'Enter the code sent to your email to confirm deactivation.' });
                } else {
                    toast({ variant: 'destructive', title: 'Dispatch Failed', description: sendResult.error || 'Could not send verification code.' });
                }
            } catch (err) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to dispatch verification code.' });
            } finally {
                setIsProcessing(false);
            }
            return;
        }

        if (!verificationCode) {
            toast({ variant: 'destructive', title: 'Code Required', description: 'Please enter your verification or backup code.' });
            return;
        }

        setIsProcessing(true);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const isBackup = verificationCode.length > 6;
            
            const response = await fetch('/api/auth/setup-mfa', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ 
                    action: 'disable',
                    code: verificationCode,
                    isBackupCode: isBackup
                })
            });
            const result = await response.json();
            if (result.success) {
                setSetupStep('idle');
                setDisableStep('idle');
                setVerificationCode('');
                setBackupCodes([]);
                toast({ title: 'MFA Disabled', description: 'Secondary authentication has been removed.' });
            } else {
                toast({ variant: 'destructive', title: 'Deactivation Failed', description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update security settings.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRevokeTrust = () => {
        if (!auth?.currentUser) return;
        localStorage.removeItem(`kontrola_mfa_trust_${auth.currentUser.uid}`);
        toast({ title: 'Trust Data Revoked', description: 'All trusted device sessions for this terminal have been invalidated.' });
    };

    const copyBackupCodes = () => {
        navigator.clipboard.writeText(backupCodes.join('\n'));
        toast({ title: 'Copied', description: 'Backup codes copied to clipboard.' });
    };

    return (
        <Card className="border-emerald-500/10 bg-emerald-500/[0.01]">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            SecureAccess Control
                            <Badge variant="outline" className={`bg-emerald-500/10 border-emerald-500/20 text-[10px] font-black uppercase tracking-widest ${profile?.mfaEnabled ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {profile?.mfaEnabled ? 'Shield Active' : 'Standby'}
                            </Badge>
                        </CardTitle>
                        <CardDescription>Multi-Factor Authentication and Identity Recovery</CardDescription>
                    </div>
                </div>
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${profile?.mfaEnabled ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                    {profile?.mfaEnabled ? <ShieldCheck className="h-6 w-6 text-emerald-500" /> : <ShieldAlert className="h-6 w-6 text-amber-500" />}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {setupStep === 'idle' && (
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 rounded-xl border bg-background/50">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                                <Key className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold">Email-Based 2FA</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Adds an extra layer of security to your account by requesting a unique code sent to your email whenever you sign in from a new device or session.
                                </p>
                            </div>
                        </div>
                        <Button 
                            className="w-full h-12 rounded-xl font-bold transition-all active:scale-[0.98]" 
                            onClick={handleStartSetup}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Initialize SecureAccess
                        </Button>
                    </div>
                )}

                {setupStep === 'backup_codes' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                            <div className="flex items-center gap-2 text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                <p className="text-xs font-black uppercase tracking-widest">Crucial: Save Backup Codes</p>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                If you lose access to your email, these codes are the ONLY way to recover your account. Store them in a password manager or print them out.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-sm tracking-wider">
                            {backupCodes.map((code, idx) => (
                                <div key={idx} className="text-white/60 flex gap-3 items-center">
                                    <span className="text-white/20 text-[10px] w-4">{idx + 1}</span>
                                    {code}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1 h-10 rounded-xl text-xs gap-2" onClick={copyBackupCodes}>
                                <Copy className="h-3 w-3" /> Copy
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 h-10 rounded-xl text-xs gap-2" onClick={() => window.print()}>
                                <Download className="h-3 w-3" /> Print
                            </Button>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-border/10">
                            <Label htmlFor="verificationCode" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Enter one of the backup codes to confirm activation:
                            </Label>
                            <Input
                                id="verificationCode"
                                placeholder="XXXX-XXXX"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                                className="h-10 text-center font-mono tracking-widest uppercase bg-background/50"
                                maxLength={9}
                            />
                        </div>

                        <Button 
                            className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all active:scale-[0.98] gap-2 shadow-lg shadow-emerald-500/20" 
                            onClick={handleConfirmSetup}
                            disabled={isProcessing || !verificationCode}
                        >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Confirm MFA Activation
                        </Button>
                    </div>
                )}

                {setupStep === 'active' && (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="flex items-center gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03]">
                            <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold text-emerald-600">SecureAccess is Active</p>
                                <p className="text-[10px] text-emerald-600/60 uppercase font-black tracking-widest">Email Verification Enforced</p>
                            </div>
                        </div>
                        
                        <div className="p-4 rounded-xl border bg-background/50 space-y-3">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Your account is currently protected. Secondary authentication will be required for all future sign-in attempts.
                            </p>

                            {disableStep === 'confirm' && (
                                <div className="space-y-2 pt-2 pb-4 border-t border-border/10 animate-in slide-in-from-top-2 duration-300">
                                    <Label htmlFor="disableCode" className="text-xs font-bold uppercase tracking-widest text-red-500">
                                        Enter email security code or backup code:
                                    </Label>
                                    <Input
                                        id="disableCode"
                                        placeholder="000000 or XXXX-XXXX"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                                        className="h-10 text-center font-mono tracking-widest uppercase bg-background/50"
                                        maxLength={9}
                                    />
                                    <div className="flex gap-2 pt-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setDisableStep('idle');
                                                setVerificationCode('');
                                            }}
                                            className="flex-1 h-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <Button 
                                variant={disableStep === 'confirm' ? 'destructive' : 'outline'} 
                                size="sm" 
                                className="w-full h-10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                                onClick={handleDisableMfa}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                ) : disableStep === 'confirm' ? (
                                    'Confirm Deactivation'
                                ) : (
                                    'Disable Protection'
                                )}
                            </Button>
                            
                            {disableStep === 'idle' && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full h-8 text-[10px] text-muted-foreground hover:text-white font-black uppercase tracking-widest"
                                    onClick={handleRevokeTrust}
                                >
                                    Revoke Trusted Devices
                                </Button>
                            )}
                        </div>
                    </div>
                )}

            </CardContent>
        </Card>
    );
}
