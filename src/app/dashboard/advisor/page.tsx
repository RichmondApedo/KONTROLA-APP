'use client';

import { InsightsGenerator } from "@/components/advisor/insights-generator";

export default function AdvisorPage() {
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="text-center">
                <h1 className="text-3xl font-bold font-headline tracking-tight">AI Financial Advisor</h1>
                <p className="text-muted-foreground mt-2">Get personalized tips and recommendations to improve your financial health.</p>
            </div>
            <InsightsGenerator />
        </div>
    );
}
