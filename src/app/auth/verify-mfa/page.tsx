'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert, Loader2, Key, CheckCircle2, ArrowRight } from 'lucide-react';
import { useUser, useUserProfile } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function VerifyMFAPage() {
    const { user, isUserLoading } = useUser();
    const { profile, isProfileLoading } = useUserProfile();
    const router = useRouter();
    const { toast } = useToast();

    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Redirect if not logged in or doesn't have MFA enabled
    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            if (!user) {
                router.push('/auth/login');
            } else if (!profile?.mfaEnabled) {
                router.push('/dashboard');
            }
        }
    }, [user, profile, isUserLoading, isProfileLoading, router]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length !== 6 || !user) return;

        setIsLoading(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/auth/mfa/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ code })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Verification failed');
            }

            // Success! Store verification in session storage to avoid re-verifying during this session
            sessionStorage.setItem(`mfa_verified_${user.uid}`, 'true');
            setIsSuccess(true);
            
            toast({
                title: "Identity Verified",
                description: "Terminal access granted.",
            });

            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Verification Failure",
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
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
                throw new Error(error.error || 'Failed to resend code');
            }

            toast({
                title: "New Code Sent",
                description: "Please check your inbox.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Resend Failed",
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isUserLoading || isProfileLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
            <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center space-y-6">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mb-2 relative">
                        {isSuccess ? (
                            <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-in zoom-in-50 duration-500" />
                        ) : (
                            <>
                                <Key className="h-10 w-10 text-primary" />
                                <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center border-4 border-slate-50">
                                    <ShieldAlert className="h-3 w-3 text-white" />
                                </div>
                            </>
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-tight">
                            Identity Verification
                        </h1>
                        <p className="text-sm font-medium text-slate-500 max-w-[280px] mx-auto">
                            Your account is protected by **Email Guard**. Please enter the code sent to your inbox.
                        </p>
                    </div>

                    <div className="flex justify-center">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest px-3 py-1">
                            {user?.email}
                        </Badge>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-8 relative overflow-hidden">
                    {/* Animated background element */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                    <form onSubmit={handleVerify} className="space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="otp" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">
                                6-Digit Verification Code
                            </Label>
                            <Input
                                id="otp"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="· · · · · ·"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                disabled={isLoading || isSuccess}
                                className="h-16 text-center text-3xl font-black tracking-[0.5em] border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                            />
                        </div>

                        <Button 
                            type="submit" 
                            disabled={isLoading || code.length !== 6 || isSuccess}
                            className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 group"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : isSuccess ? (
                                <span className="flex items-center gap-2">Verified <CheckCircle2 className="h-4 w-4" /></span>
                            ) : (
                                <span className="flex items-center gap-2">Grant Access <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></span>
                            )}
                        </Button>
                    </form>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={isLoading || isSuccess}
                            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors disabled:opacity-50"
                        >
                            Request New Secure Code
                        </button>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-300">
                        Protected by KONTROLA Privacy Shield
                    </p>
                </div>
            </div>
        </div>
    );
}
