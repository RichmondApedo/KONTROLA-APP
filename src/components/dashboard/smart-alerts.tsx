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
        <div className="space-y-3">
             <div className="flex items-center gap-2 px-1">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Strategic Insights</h3>
            </div>
            {alerts.slice(0, 2).map((alert) => (
                <Alert key={alert.id} className={`${getBgColor(alert.type)} border group transition-all`}>
                    <div className="flex gap-3">
                        <div className="mt-0.5 shrink-0">
                            {getIcon(alert.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                            <AlertTitle className="text-sm font-bold flex items-center justify-between">
                                {alert.title}
                            </AlertTitle>
                            <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
                                {alert.description}
                                {alert.actionPath && (
                                    <div className="mt-2">
                                        <Link href={alert.actionPath}>
                                            <Button variant="link" size="sm" className="h-auto p-0 text-[10px] text-primary font-bold decoration-primary/30">
                                                {alert.actionLabel || 'Take Action'} <ChevronRight className="ml-0.5 h-3 w-3" />
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </AlertDescription>
                        </div>
                    </div>
                </Alert>
            ))}
        </div>
    );
}
