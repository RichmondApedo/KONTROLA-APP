import { InsightsGenerator } from "@/components/advisor/insights-generator";

export default function AdvisorPage() {
    return (
        <div className="relative space-y-6 overflow-hidden rounded-xl p-1">
             <div className="absolute top-0 -left-10 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob"></div>
            <div className="absolute top-0 -right-10 w-72 h-72 bg-accent/20 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob" style={{animationDelay: '2s'}}></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob" style={{animationDelay: '4s'}}></div>
            
            <div className="relative z-10 space-y-6 max-w-4xl mx-auto">
                <div className="text-center">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">AI Financial Advisor</h1>
                    <p className="text-muted-foreground mt-2">Get personalized tips and recommendations to improve your financial health.</p>
                </div>
                <InsightsGenerator />
            </div>
        </div>
    );
}
