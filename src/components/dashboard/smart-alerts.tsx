'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import type { Expense, Budget } from '@/lib/types';
import { subMonths, startOfMonth } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
    AlertTriangle, 
    Info, 
    CheckCircle2, 
    X, 
    ChevronRight,
    TrendingDown,
    Zap
} from 'lucide-react';
import { getSpendingAlerts, type SpendingAlert } from '@/lib/spending-alerts';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function SmartAlerts() {
    const { user } = useUser();
    const firestore = useFirestore();

    const monthStart = useMemo(() => startOfMonth(new Date()), []);

    // Fetch data for alerts
    const expensesQuery = useMemo(() => user && firestore ? query(
        collection(firestore, `users/${user.uid}/expenses`),
        where('date', '>=', Timestamp.fromDate(monthStart))
    ) : null, [user, firestore, monthStart]);

    const budgetsQuery = useMemo(() => user && firestore ? query(
        collection(firestore, `users/${user.uid}/budgets`)
    ) : null, [user, firestore]);

    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);

    const alerts = useMemo(() => {
        if (!expenses || !budgets) return [];
        return getSpendingAlerts(expenses, budgets);
    }, [expenses, budgets]);

    if (expensesLoading || budgetsLoading || alerts.length === 0) return null;

    const getIcon = (type: SpendingAlert['type']) => {
        switch (type) {
            case 'warning': return <AlertTriangle className="h-4 w-4 text-destructive" />;
            case 'info': return <Zap className="h-4 w-4 text-blue-500" />;
            case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    const getBgColor = (type: SpendingAlert['type']) => {
        switch (type) {
            case 'warning': return 'bg-destructive/5 border-destructive/20';
            case 'info': return 'bg-blue-500/5 border-blue-500/20';
            case 'success': return 'bg-green-500/5 border-green-500/20';
            default: return 'bg-muted';
        }
    };

    return (
        <div className="space-y-4">
             <div className="flex items-center gap-2 px-1">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Smart Insights</h3>
            </div>
            <div className="space-y-3">
                {alerts.slice(0, 3).map((alert) => (
                    <div 
                        key={alert.id} 
                        className={cn(
                            "relative overflow-hidden group transition-all duration-300 p-4 rounded-2xl border shadow-soft glass-card",
                            getBgColor(alert.type)
                        )}
                    >
                        <div className="flex gap-4 relative z-10">
                            <div className="mt-1 shrink-0 p-2 rounded-xl bg-background/50 border border-white/10 shadow-sm">
                                {getIcon(alert.type)}
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black tracking-tight">{alert.title}</h4>
                                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Just Now</span>
                                </div>
                                <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                                    {alert.description}
                                </p>
                                {alert.actionPath && (
                                    <div className="pt-2">
                                        <Link href={alert.actionPath}>
                                            <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors">
                                                {alert.actionLabel || 'Analyze'} <ChevronRight className="ml-1 h-3 w-3" />
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
