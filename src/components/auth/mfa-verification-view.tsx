'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, RefreshCw, ChevronLeft, Key, CheckCircle2, Mail } from 'lucide-react';
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

    // Auto-verify when 6 digits are entered in OTP mode
    useEffect(() => {
        if (mode === 'otp' && code.length === 6) {
            handleVerify();
        }
    }, [code, mode]);

    // AUTO-SEND ON MOUNT
    useEffect(() => {
        const hasSent = sessionStorage.getItem('kontrola_mfa_sent_this_session');
        if (!hasSent && mode === 'otp') {
            handleResend().then(() => {
                sessionStorage.setItem('kontrola_mfa_sent_this_session', 'true');
            });
        }
    }, []);

    const KontrolaIcon = () => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center gap-6 py-8 animate-in fade-in zoom-in-95 duration-500 transform-gpu">
                <div className="relative">
                    <div className="h-20 w-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" strokeWidth={1.5} />
                    </div>
                    <div className="absolute -inset-2 rounded-[2rem] bg-emerald-500/5 animate-ping" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">Identity Confirmed</h2>
                    <p className="text-sm text-white/50 max-w-[260px] leading-relaxed">
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
            <div className="flex flex-col items-center gap-5 pb-8">
                {/* App Icon */}
                <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(var(--primary),0.15)]">
                        <KontrolaIcon />
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                        <ShieldCheck className="h-2 w-2 text-white" strokeWidth={3} />
                    </div>
                </div>

                {/* Title Block */}
                <div className="text-center space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">KONTROLA · SecureAccess</p>
                    <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
                        {mode === 'otp' ? 'Verify Your Account' : 'Account Recovery'}
                    </h1>
                    <p className="text-sm text-white/45 max-w-[290px] leading-relaxed">
                        {mode === 'otp'
                            ? 'A 6-digit verification code was sent to your registered email address. Enter it below to continue.'
                            : 'Enter one of your saved 8-character backup codes to regain access to your account.'}
                    </p>
                </div>
            </div>

            {/* ── Process Steps ── */}
            <div className="flex items-center justify-center gap-0 mb-7">
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Signed In</span>
                </div>
                <div className="h-[1px] w-6 bg-gradient-to-r from-emerald-500/40 to-primary/40 mx-2" />
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_6px_rgba(var(--primary),0.6)]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Verify Identity</span>
                </div>
                <div className="h-[1px] w-6 bg-white/10 mx-2" />
                <div className="flex items-center gap-1.5 opacity-30">
                    <div className="h-2 w-2 rounded-full bg-white/50" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white">Dashboard</span>
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
                        className="w-full h-16 bg-white/[0.04] border border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 rounded-2xl text-center text-3xl font-black tracking-[0.4em] text-white placeholder:text-white/10 outline-none transition-all duration-200 disabled:opacity-60"
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
                                className={`h-1.5 w-5 rounded-full transition-all duration-200 ${i < code.length ? 'bg-primary shadow-[0_0_6px_rgba(var(--primary),0.5)]' : 'bg-white/10'}`}
                            />
                        ))}
                    </div>
                )}

                {/* Trust Device Toggle */}
                <button
                    type="button"
                    onClick={() => setTrustDevice(!trustDevice)}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-200 group select-none"
                >
                    <div className={`h-4 w-4 rounded border-[1.5px] transition-all duration-200 flex items-center justify-center ${trustDevice ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 bg-transparent group-hover:border-white/40'}`}>
                        {trustDevice && (
                            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </div>
                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest group-hover:text-white/60 transition-colors">
                        Keep me verified for 30 days
                    </span>
                </button>

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
            <div className="pt-5 space-y-1 border-t border-white/5 mt-6">
                {mode === 'otp' ? (
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 text-white/30">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="text-[11px]">Didn't receive the code?</span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-[11px] font-black uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/10 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={handleResend}
                            disabled={isResending || resendCooldown > 0}
                        >
                            {isResending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : resendCooldown > 0 ? (
                                `Resend in ${resendCooldown}s`
                            ) : (
                                <><RefreshCw className="mr-1.5 h-3 w-3" />Resend Code</>
                            )}
                        </Button>
                    </div>
                ) : (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full h-9 text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white/70 gap-2 transition-all"
                        onClick={() => { setMode('otp'); setCode(''); }}
                    >
                        <ChevronLeft className="h-3.5 w-3.5" /> Back to Email Code
                    </Button>
                )}

                {mode === 'otp' && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full h-9 text-[11px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 gap-2 rounded-xl transition-all"
                        onClick={() => { setMode('backup'); setCode(''); }}
                    >
                        <Key className="h-3 w-3" /> Use Backup Code Instead
                    </Button>
                )}

                <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="w-full h-8 text-[10px] uppercase tracking-widest text-white/15 hover:text-white/35 transition-all"
                    onClick={onCancel}
                >
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
