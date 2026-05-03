'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { collection, query, where, Timestamp, orderBy, limit, getDocs } from 'firebase/firestore';
import { generateSafeToSaveInsight, type SafeToSaveOutput } from '@/ai/flows/safe-to-save-flow';
import { subDays } from 'date-fns';
import { preciseRound } from '@/lib/utils';
import type { IncomeSource, Expense } from '@/lib/types';

export function useSafeToSave() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { profile } = useUserProfile();
    
    const [insight, setInsight] = useState<SafeToSaveOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    // Fetch the last 90 days of transactions
    const ninetyDaysAgo = useMemo(() => subDays(new Date(), 90), []);

    useEffect(() => {
        async function fetchInsight() {
            if (!user || !firestore || !profile || hasFetched.current) return;

            hasFetched.current = true;
            setIsLoading(true);
            setError(null);

            try {
                // 1. Fetch Income
                const incomeQuery = query(
                    collection(firestore, `users/${user.uid}/incomeSources`),
                    where('context', '!=', 'business'),
                    orderBy('context'),
                    where('date', '>=', Timestamp.fromDate(ninetyDaysAgo)),
                    orderBy('date', 'desc')
                );
                const incomeSnap = await getDocs(incomeQuery);
                const incomeData = incomeSnap.docs.map(doc => ({
                    ...doc.data(),
                    type: 'income',
                    date: (doc.data().date as Timestamp).toDate().toISOString(),
                })) as any[];

                // 2. Fetch Expenses
                const expenseQuery = query(
                    collection(firestore, `users/${user.uid}/expenses`),
                    where('context', '!=', 'business'),
                    orderBy('context'),
                    where('date', '>=', Timestamp.fromDate(ninetyDaysAgo)),
                    orderBy('date', 'desc')
                );
                const expenseSnap = await getDocs(expenseQuery);
                const expenseData = expenseSnap.docs.map(doc => ({
                    ...doc.data(),
                    type: 'expense',
                    date: (doc.data().date as Timestamp).toDate().toISOString(),
                })) as any[];

                // Combine and format for AI
                const allTransactions = [...incomeData, ...expenseData];

                // 3. Calculate current balance from LinkedAccounts
                const accountsQuery = query(collection(firestore, `users/${user.uid}/linkedAccounts`));
                const accountsSnap = await getDocs(accountsQuery);
                const linkedBalance = accountsSnap.docs.reduce((acc, doc) => acc + (doc.data().balance || 0), 0);

                // 4. Fetch Unpaid Bills for AI Context
                const billsQuery = query(
                    collection(firestore, `users/${user.uid}/bills`),
                    where('context', '==', 'personal'),
                    where('status', '==', 'unpaid')
                );
                const billsSnap = await getDocs(billsQuery);
                const billsData = billsSnap.docs.map(doc => ({
                    name: doc.data().name || 'Bill',
                    amount: doc.data().amount || 0,
                    dueDate: doc.data().dueDate instanceof Timestamp ? doc.data().dueDate.toDate().toISOString() : new Date(doc.data().dueDate).toISOString(),
                }));

                // Fallback to monthly net flow if no linked accounts
                const monthlyNetFlow = preciseRound(incomeData.reduce((acc, t) => acc + t.amount, 0) - expenseData.reduce((acc, t) => acc + t.amount, 0));
                const currentBalance = preciseRound(linkedBalance || Math.max(0, monthlyNetFlow));

                const idToken = await user.getIdToken();

                // 5. Call AI Flow
                const result = await generateSafeToSaveInsight({
                    profile: {
                        firstName: profile.firstName,
                        plan: profile.plan || 'free',
                        preferredCurrency: profile.preferredCurrency || 'ghs',
                    },
                    currentBalance,
                    allBills: billsData,
                    recentTransactions: allTransactions.map(t => ({
                        description: t.description || t.name,
                        name: t.name,
                        amount: t.amount,
                        category: t.category || 'General',
                        date: t.date,
                        type: t.type,
                    })),
                    userId: user.uid,
                    idToken: idToken
                });

                setInsight(result);
            } catch (err: any) {
                console.error("Error in useSafeToSave:", err);
                hasFetched.current = false; // Allow retry on valid user action, but prevents auto-retry looping
                setError(err.message || "Failed to generate savings insight.");
            } finally {
                setIsLoading(false);
            }
        }

        fetchInsight();
    }, [user, firestore, profile, ninetyDaysAgo]);

    return { insight, isLoading, error };
}

