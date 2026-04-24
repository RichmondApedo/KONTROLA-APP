'use client';

import { InsightsGenerator } from "@/components/advisor/insights-generator";
import { useUser, useUserProfile } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function AdvisorPage() {
    const { user } = useUser();
    const { activeProfileId } = useUserProfile();

    const isDelegate = activeProfileId && user && activeProfileId !== user.uid;

    if (isDelegate) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="h-24 w-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center shadow-inner border border-emerald-500/20">
                    <Lock className="h-12 w-12 text-emerald-500" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-black font-headline tracking-tight text-primary">Privacy Shield Active</h1>
                    <p className="text-muted-foreground font-medium max-w-md mx-auto">
                        You are currently in a delegated business session. Personalized financial coaching and AI insights are restricted to the account owner.
                    </p>
                </div>
                <Button asChild variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-[10px] border-primary/20 bg-primary/5 hover:bg-primary/10">
                    <Link href="/dashboard/business">Return to Business Suite</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* --- EXPERT HEADER SECTION --- */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pt-4 pb-8 border-b border-border/10 relative min-h-[160px] xl:min-h-[140px]">
                <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">AI Intelligence Active</span>
                    </div>
                    <h1 className="text-[clamp(1.75rem,7vw,4.5rem)] font-black font-headline tracking-tighter text-foreground leading-[0.85] sm:leading-[0.9]">
                        Advisor
                    </h1>
                    <p className="text-muted-foreground text-xs sm:text-sm font-bold uppercase tracking-widest opacity-60">
                        Financial Coaching • <span className="text-primary">Personalized Strategy</span>
                    </p>
                </div>
                
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 border border-primary/10">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Verified Insights</span>
                </div>
            </div>

            <div className="max-w-4xl mx-auto">
                <InsightsGenerator />
            </div>
        </div>
    );
}
