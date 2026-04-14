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
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="text-center">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Personalized Financial Advisor</h1>
                <p className="text-muted-foreground mt-2">Get personalized tips and recommendations to improve your financial health.</p>
            </div>
            <InsightsGenerator />
        </div>
    );
}
