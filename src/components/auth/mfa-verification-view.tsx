'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, RefreshCw, ChevronLeft, Key, CheckCircle2, Mail } from 'lucide-react';
import { useAuth, useUserProfile } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';

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
    const [resendCooldown, setResendCooldown] = useState(0);
    const [mode, setMode] = useState<'otp' | 'backup'>('otp');
    const [trustDevice, setTrustDevice] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [resendCooldown]);

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
                setMfaVerified(true, trustDevice);
                setTimeout(() => {
                    onSuccess();
                }, 1400);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Verification Failed',
                    description: result.error || 'The code entered is invalid or has expired.'
                });
                setCode('');
                inputRef.current?.focus();
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Connection Error', description: 'Could not reach the security server. Please try again.' });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        if (!auth?.currentUser || resendCooldown > 0) return;
        setIsResending(true);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch('/api/auth/send-mfa', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            const result = await response.json();
            if (result.success) {
                setResendCooldown(60);
                toast({ title: 'New Code Dispatched', description: 'A fresh 6-digit code has been sent to your email.' });
            } else {
                toast({ variant: 'destructive', title: 'Request Failed', description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to resend verification code.' });
        } finally {
            setIsResending(false);
        }
    };


    // AUTO-SEND ON MOUNT
    useEffect(() => {
        const hasSent = sessionStorage.getItem('kontrola_mfa_sent_this_session');
        if (!hasSent && mode === 'otp') {
            handleResend().then(() => {
                sessionStorage.setItem('kontrola_mfa_sent_this_session', 'true');
            });
        }
    }, []);


    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center gap-6 py-8 animate-in fade-in zoom-in-95 duration-500 transform-gpu">
                <div className="relative">
                    <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.15)]">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" strokeWidth={1.5} />
                    </div>
                    <div className="absolute -inset-2 rounded-[2rem] bg-emerald-500/5 animate-ping" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black text-foreground tracking-tight">Identity Confirmed</h2>
                    <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed font-medium">
                        Your KONTROLA session is secured. Taking you to your dashboard.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-emerald-500/70">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Establishing Session</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-0 animate-in fade-in zoom-in-95 duration-500 transform-gpu overflow-visible">

            {/* ── Brand Header ── */}
            <div className="flex flex-col items-center gap-6 pb-10">
                {/* Official Brand Logo */}
                <div className="relative group">
                    <div className="absolute -inset-4 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />
                    <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-card to-muted border border-border/50 flex items-center justify-center text-primary shadow-premium group-hover:scale-105 transition-transform duration-500">
                        <Logo hideText className="h-8 w-8" />
                    </div>
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center shadow-lg">
                        <ShieldCheck className="h-3 w-3 text-white" strokeWidth={2.5} />
                    </div>
                </div>

                {/* Title Block */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">SecureAccess Terminal</p>
                    </div>
                    <h1 className="text-2xl font-black text-foreground tracking-tight leading-tight">
                        {mode === 'otp' ? 'Identify Yourself' : 'Security Recovery'}
                    </h1>
                    <p className="text-sm text-muted-foreground/80 font-medium max-w-[300px] leading-relaxed px-2">
                        {mode === 'otp'
                            ? 'A 6-digit verification code was sent to your registered email. Enter it below to unlock your terminal.'
                            : 'Enter one of your saved 8-character backup codes to regain access to your account.'}
                    </p>
                </div>
            </div>

            {/* ── Process Steps ── */}
            <div className="flex items-center justify-center gap-0 mb-8 px-4">
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-600/80">Authorized</span>
                </div>
                <div className="h-[1px] w-6 bg-gradient-to-r from-emerald-500/20 to-primary/20 mx-2" />
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-foreground font-black">Identity</span>
                </div>
                <div className="h-[1px] w-6 bg-muted mx-2" />
                <div className="flex items-center gap-1.5 opacity-30">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground font-black">Terminal</span>
                </div>
            </div>

            {/* ── Code Input ── */}
            <form onSubmit={handleVerify} className="space-y-4">
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode={mode === 'otp' ? 'numeric' : 'text'}
                        pattern={mode === 'otp' ? '[0-9]*' : undefined}
                        placeholder={mode === 'otp' ? '0  0  0  0  0  0' : 'XXXX-XXXX'}
                        className="w-full h-16 bg-muted/30 border border-input focus:border-primary/50 focus:ring-4 focus:ring-primary/5 rounded-2xl text-center text-3xl font-black tracking-[0.4em] text-foreground placeholder:text-muted-foreground/20 outline-none transition-all duration-300 disabled:opacity-60"
                        style={{ fontSize: '1.75rem' }}
                        value={code}
                        onChange={(e) => {
                            const val = e.target.value.toUpperCase();
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
                    {/* Progress indicator bar at the bottom of the input */}
                    {mode === 'otp' && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-2xl overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-300"
                                style={{ width: `${(code.length / 6) * 100}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* Code progress dots */}
                {mode === 'otp' && (
                    <div className="flex justify-center gap-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 w-5 rounded-full transition-all duration-300 ${i < code.length ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]' : 'bg-muted/60'}`}
                            />
                        ))}
                    </div>
                )}

                {/* 30-Day Trust Card */}
                {auth?.currentUser?.emailVerified ? (
                    <div 
                        onClick={() => setTrustDevice(!trustDevice)}
                        className={cn(
                            "relative w-full p-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none",
                            trustDevice 
                                ? "bg-primary/[0.08] border-primary/30 shadow-[0_4px_20px_rgba(var(--primary-rgb),0.1)] scale-[1.02]" 
                                : "bg-muted/20 border-border/40 hover:bg-muted/40 hover:border-border"
                        )}
                    >
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300",
                                trustDevice ? "bg-primary text-white shadow-lg" : "bg-muted text-muted-foreground/40"
                            )}>
                                <ShieldCheck className={cn("h-5 w-5 transition-transform duration-500", trustDevice ? "scale-110" : "scale-100")} />
                            </div>
                            <div className="flex-1 text-left">
                                <p className={cn(
                                    "text-[11px] font-black uppercase tracking-widest transition-colors",
                                    trustDevice ? "text-primary" : "text-foreground/60"
                                )}>
                                    Trust this device
                                </p>
                                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                    Keep me verified for the next 30 days
                                </p>
                            </div>
                            <div className={cn(
                                "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                                trustDevice ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30 bg-transparent"
                            )}>
                                {trustDevice && (
                                    <svg viewBox="0 0 12 12" className="h-3 w-3 text-white fill-none">
                                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        {trustDevice && (
                            <div className="absolute -top-2 -right-2 bg-primary text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm animate-in zoom-in-50">
                                Recommended
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full p-4 rounded-2xl border border-dashed border-border/60 bg-muted/5 opacity-80">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground/30">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40 line-through">
                                    Trust this device
                                </p>
                                <p className="text-[10px] text-amber-500/70 font-bold mt-0.5">
                                    Verify email to enable persistence
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <Button
                    type="submit"
                    className="w-full h-13 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm shadow-lg shadow-primary/20 transition-all active:scale-[0.98] tracking-wide"
                    disabled={isVerifying || (mode === 'otp' ? code.length < 6 : code.length < 9)}
                >
                    {isVerifying ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                    ) : (
                        'Confirm & Continue'
                    )}
                </Button>
            </form>

            {/* ── Secondary Actions ── */}
            <div className="pt-6 space-y-2 border-t border-border/40 mt-8">
                {mode === 'otp' ? (
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 text-muted-foreground/60">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">Didn't receive code?</span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:text-primary hover:bg-primary/5 rounded-xl transition-all disabled:opacity-40"
                            onClick={handleResend}
                            disabled={isResending || resendCooldown > 0}
                        >
                            {isResending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : resendCooldown > 0 ? (
                                `${resendCooldown}s`
                            ) : (
                                <><RefreshCw className="mr-1.5 h-3 w-3" />Resend</>
                            )}
                        </Button>
                    </div>
                ) : (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full h-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground gap-2 transition-all rounded-xl"
                        onClick={() => { setMode('otp'); setCode(''); }}
                    >
                        <ChevronLeft className="h-3.5 w-3.5" /> Back to Email
                    </Button>
                )}

                {mode === 'otp' && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full h-10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-foreground gap-2 rounded-xl transition-all"
                        onClick={() => { setMode('backup'); setCode(''); }}
                    >
                        <Key className="h-3 w-3" /> Use Backup Code
                    </Button>
                )}

                <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="w-full h-8 text-[9px] uppercase tracking-[0.3em] font-black text-muted-foreground/30 hover:text-destructive/50 transition-all mt-4"
                    onClick={onCancel}
                >
                    Abandon Session
                </Button>
            </div>
        </div>
    );
}
