'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck, RefreshCw, ChevronLeft, Key } from 'lucide-react';
import { useAuth, useUserProfile } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

interface MfaVerificationViewProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export function MfaVerificationView({ onSuccess, onCancel }: MfaVerificationViewProps) {
    const auth = useAuth();
    const { profile, setMfaVerified } = useUserProfile();
    const { toast } = useToast();

    const [code, setCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [mode, setMode] = useState<'otp' | 'backup'>('otp');

    const handleVerify = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (code.length < 6 && mode === 'otp') return;
        if (!auth?.currentUser) return;

        setIsVerifying(true);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch('/api/auth/verify-mfa', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ 
                    code, 
                    isBackupCode: mode === 'backup' 
                })
            });

            const result = await response.json();

            if (result.success) {
                setIsSuccess(true);
                setMfaVerified(true);
                // Short deliberate delay so user sees the success state before redirect
                setTimeout(() => {
                    onSuccess();
                }, 1200);
            } else {
                toast({ 
                    variant: 'destructive', 
                    title: 'Verification Failed', 
                    description: result.error || 'The code entered is invalid or expired.' 
                });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Connection Error', description: 'Could not reach the security server.' });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        if (!auth?.currentUser) return;
        setIsResending(true);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch('/api/auth/send-mfa', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${idToken}`
                }
            });
            const result = await response.json();
            if (result.success) {
                toast({ title: 'New Code Sent', description: 'Please check your email inbox.' });
            } else {
                toast({ variant: 'destructive', title: 'Request Failed', description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to resend verification code.' });
        } finally {
            setIsResending(false);
        }
    };

    // Auto-verify when 6 digits are entered in OTP mode
    useEffect(() => {
        if (mode === 'otp' && code.length === 6) {
            handleVerify();
        }
    }, [code, mode]);

    // AUTO-SEND ON MOUNT (if not already sent in this session)
    useEffect(() => {
        const hasSent = sessionStorage.getItem('kontrola_mfa_sent_this_session');
        if (!hasSent && mode === 'otp') {
            handleResend().then(() => {
                sessionStorage.setItem('kontrola_mfa_sent_this_session', 'true');
            });
        }
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center space-y-2">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                    {isSuccess ? (
                        <div className="animate-in zoom-in duration-500">
                             <ShieldCheck className="h-6 w-6 text-emerald-500 fill-emerald-500/20" />
                        </div>
                    ) : (
                        <ShieldCheck className="h-6 w-6 text-emerald-500" />
                    )}
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white transition-all">
                    {isSuccess ? 'Access Authorized' : mode === 'otp' ? 'Security Check' : 'Shield Recovery'}
                </h2>
                <div className="flex flex-col gap-1 items-center">
                    <p className="text-sm text-white/45 leading-relaxed max-w-[280px]">
                        {isSuccess 
                            ? "Your terminal session is now encrypted and authorized. Redirecting to your dashboard..."
                            : mode === 'otp' 
                                ? `A 6-digit security code was sent to your registered email for verification.`
                                : "Enter one of your 8-character backup codes to authorize this session."
                        }
                    </p>
                    {!isSuccess && mode === 'otp' && (
                        <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">
                            Code expires in 10 minutes
                        </p>
                    )}
                </div>
            </div>

            {/* Stepper Process Tracker */}
            {!isSuccess && (
                <div className="flex items-center justify-center gap-2 py-2">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-500/60">Verified</span>
                    </div>
                    <div className="h-[1px] w-4 bg-white/10" />
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-tighter text-white/80">Authorize</span>
                    </div>
                    <div className="h-[1px] w-4 bg-white/10" />
                    <div className="flex items-center gap-2 opacity-30">
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        <span className="text-[9px] font-black uppercase tracking-tighter text-white">Dashboard</span>
                    </div>
                </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
                <div className="relative group">
                    <Input
                        type="text"
                        inputMode={mode === 'otp' ? "numeric" : "text"}
                        pattern={mode === 'otp' ? "[0-9]*" : undefined}
                        placeholder={mode === 'otp' ? "000 000" : "XXXX-XXXX"}
                        className="h-14 bg-white/5 border-white/10 text-center text-3xl font-black tracking-[0.3em] text-white placeholder:text-white/5 focus:border-emerald-500/50 focus:ring-emerald-500/20 rounded-xl transition-all"
                        value={code}
                        onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            // For OTP, strip anything that isn't a digit
                            if (mode === 'otp') {
                                setCode(val.replace(/\D/g, '').slice(0, 6));
                            } else {
                                setCode(val.slice(0, 9));
                            }
                        }}
                        maxLength={mode === 'otp' ? 6 : 9}
                        disabled={isVerifying}
                        autoFocus
                    />
                </div>

                <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl bg-white text-black hover:bg-white/90 font-bold shadow-xl shadow-white/10 transition-all active:scale-[0.98]"
                    disabled={isVerifying || (mode === 'otp' ? code.length < 6 : code.length < 9)}
                >
                    {isVerifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : 'Continue'}
                </Button>
            </form>

            <div className="flex flex-col gap-3 py-2">
                {mode === 'otp' ? (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-white/40 hover:text-white/60 text-xs font-bold uppercase tracking-widest gap-2"
                        onClick={handleResend}
                        disabled={isResending || isVerifying}
                    >
                        {isResending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Resend Code
                    </Button>
                ) : (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-white/40 hover:text-white/60 text-xs font-bold uppercase tracking-widest gap-2"
                        onClick={() => { setMode('otp'); setCode(''); }}
                    >
                        <ChevronLeft className="h-3 w-3" />
                        Back to Email Code
                    </Button>
                )}

                {mode === 'otp' && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary/60 hover:text-primary text-xs font-black uppercase tracking-widest gap-2"
                        onClick={() => { setMode('backup'); setCode(''); }}
                    >
                        <Key className="h-3 w-3" />
                        Use Backup Code
                    </Button>
                )}

                <Button 
                    variant="link" 
                    size="sm" 
                    className="text-white/20 hover:text-white/40 text-[10px] uppercase tracking-widest"
                    onClick={onCancel}
                >
                    Cancel and Sign Out
                </Button>
            </div>
        </div>
    );
}
