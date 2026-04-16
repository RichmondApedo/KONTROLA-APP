'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useUserProfile } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getMessagingToken } from '@/firebase/messaging';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Bell, X, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initializeFirebase } from '@/firebase/init';

export function NotificationEnrollment() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { profile, activeProfileId, isProfileLoading } = useUserProfile();
    const { toast } = useToast();
    const [isVisible, setIsVisible] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState(false);

    useEffect(() => {
        // Only show if user is logged in, profile is loaded, and they are viewing their OWN account
        // We do NOT want to show this for delegates
        if (!isProfileLoading && profile && !profile.fcmToken && !profile.notificationsEnabled) {
            const isDelegate = user && activeProfileId && user.uid !== activeProfileId;
            if (isDelegate) {
                setIsVisible(false);
                return;
            }

            // Check if they dismissed it this session (optional)
            const dismissed = sessionStorage.getItem('notifications_prompt_dismissed');
            if (!dismissed) {
                setIsVisible(true);
            }
        }
    }, [profile, isProfileLoading]);

    const handleEnable = async () => {
        if (!user || !firestore) return;
        setIsEnrolling(true);

        try {
            const { firebaseApp } = initializeFirebase();
            const token = await getMessagingToken(firebaseApp);

            if (token) {
                const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
                await updateDoc(profileRef, {
                    fcmToken: token,
                    notificationsEnabled: true
                });

                toast({
                    title: "Intelligence Link Active",
                    description: "You will now receive strategic alerts for bills, budgets, and milestones.",
                });
                setIsVisible(false);
            } else {
                toast({
                    variant: "destructive",
                    title: "Enrollment Failed",
                    description: "We couldn't activate notifications. Please check your browser permissions.",
                });
            }
        } catch (error: any) {
            console.error('Notification enrollment error:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "An unexpected error occurred during activation.",
            });
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('notifications_prompt_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="relative overflow-hidden group transition-all duration-700 p-5 sm:p-6 rounded-[2rem] border border-emerald-500/20 shadow-premium glass-card bg-emerald-500/[0.03] animate-in fade-in slide-in-from-top-4 duration-1000">
            {/* Glossy Accents */}
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:-rotate-12 duration-1000">
                <Bell className="h-24 w-24 text-emerald-500" />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                {/* Icon Core */}
                <div className="shrink-0">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center shadow-inner border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                        <Sparkles className="h-7 w-7 text-emerald-500" />
                    </div>
                </div>

                <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                                Strategic Alerts
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-white animate-pulse"
                                )}>
                                    Highly Recommended
                                </span>
                            </h3>
                            <button 
                                onClick={handleDismiss}
                                className="p-2 hover:bg-emerald-500/10 rounded-full transition-colors opacity-40 hover:opacity-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-xl">
                            Unlock real-time intelligence. Receive instant updates on <span className="text-primary font-bold">upcoming bills</span>, <span className="text-primary font-bold">budget limits</span>, and <span className="text-primary font-bold">savings milestones</span> directly to your device.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-2">
                        <Button 
                            onClick={handleEnable} 
                            disabled={isEnrolling}
                            className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all duration-500"
                        >
                            {isEnrolling ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating...</>
                            ) : (
                                <>Activate Intelligence Link</>
                            )}
                        </Button>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            <ShieldCheck className="h-3.5 w-3.5" /> High Fidelity • Encrypted
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
