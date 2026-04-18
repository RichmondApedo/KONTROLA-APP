'use client';

/**
 * @fileOverview Transaction Reconciliation Review Dialog
 *
 * Surfaces transactions that were imported from a "Mixed" (both personal & business)
 * account and could not be automatically classified via CRM matching.
 * The owner can review each one and confirm whether it belongs to Personal or Business.
 *
 * Security: Only the owning user can update their own transactions.
 * The Firestore rules enforce user-scoped write access.
 */

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, User, CheckCircle2, Inbox } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import type { IncomeSource, Expense } from '@/lib/types';

type ReviewableTransaction = (IncomeSource | Expense) & {
  type: 'income' | 'expense';
  collectionName: string;
};

function TransactionReviewCard({
  tx,
  onClassify,
  isProcessing,
}: {
  tx: ReviewableTransaction;
  onClassify: (id: string, collection: string, context: 'personal' | 'business') => void;
  isProcessing: string | null;
}) {
  const amount = tx.amount;
  const name = 'name' in tx ? tx.name : tx.description;
  const isLoading = isProcessing === tx.id;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 p-4">
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{name || 'Unnamed Transaction'}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant="outline"
            className={cn(
              'text-[9px] font-black uppercase tracking-widest',
              tx.type === 'income'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-red-500/10 text-red-600 border-red-500/20'
            )}
          >
            {tx.type === 'income' ? '+' : '−'} {formatCurrency(amount, 'ghs')}
          </Badge>
          <span className="text-[10px] text-muted-foreground font-medium">
            {tx.category}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button
          size="sm"
          variant="outline"
          disabled={isLoading}
          onClick={() => onClassify(tx.id, tx.collectionName, 'personal')}
          className="flex-1 sm:flex-none h-8 text-[10px] font-black uppercase tracking-widest gap-1.5 border-blue-500/20 text-blue-600 hover:bg-blue-500/10"
        >
          <User className="h-3 w-3" />
          Personal
        </Button>
        <Button
          size="sm"
          disabled={isLoading}
          onClick={() => onClassify(tx.id, tx.collectionName, 'business')}
          className="flex-1 sm:flex-none h-8 text-[10px] font-black uppercase tracking-widest gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Briefcase className="h-3 w-3" />
          Business
        </Button>
      </div>
    </div>
  );
}

export function TransactionReviewDialog({ trigger }: { trigger: React.ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Load unreviewed expenses
  const expenseQuery = useMemo(() =>
    user && firestore
      ? query(collection(firestore, 'users', user.uid, 'expenses'), where('needsReview', '==', true))
      : null,
    [user, firestore]
  );

  // Load unreviewed income
  const incomeQuery = useMemo(() =>
    user && firestore
      ? query(collection(firestore, 'users', user.uid, 'incomeSources'), where('needsReview', '==', true))
      : null,
    [user, firestore]
  );

  const { data: unreviewedExpenses, isLoading: expensesLoading } = useCollection<Expense>(expenseQuery);
  const { data: unreviewedIncome, isLoading: incomeLoading } = useCollection<IncomeSource>(incomeQuery);

  const allUnreviewed = useMemo((): ReviewableTransaction[] => {
    const expenses = (unreviewedExpenses || []).map(e => ({ ...e, type: 'expense' as const, collectionName: 'expenses' }));
    const income = (unreviewedIncome || []).map(i => ({ ...i, type: 'income' as const, collectionName: 'incomeSources' }));
    return [...income, ...expenses];
  }, [unreviewedExpenses, unreviewedIncome]);

  const isLoading = expensesLoading || incomeLoading;
  const pendingCount = allUnreviewed.length;

  const handleClassify = async (id: string, collectionName: string, context: 'personal' | 'business') => {
    if (!user || !firestore) return;
    setProcessingId(id);
    try {
      const txRef = doc(firestore, 'users', user.uid, collectionName, id);
      await updateDoc(txRef, { context, needsReview: false });
      toast({
        title: 'Transaction Classified',
        description: `Moved to ${context === 'personal' ? 'Personal Finances' : 'Business Finances'}.`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title="Reconcile Transactions"
      description="Review unclassified transactions from your Mixed accounts and assign each one to Personal or Business."
      className="sm:max-w-xl"
    >
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : allUnreviewed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="font-bold text-sm">All caught up!</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              All your synced transactions have been classified. Sync your accounts again to check for new ones.
            </p>
          </div>
        ) : (
          allUnreviewed.map(tx => (
            <TransactionReviewCard
              key={tx.id}
              tx={tx}
              onClassify={handleClassify}
              isProcessing={processingId}
            />
          ))
        )}
      </div>

      {!isLoading && pendingCount > 0 && (
        <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground pt-2">
          {pendingCount} transaction{pendingCount !== 1 ? 's' : ''} pending review
        </p>
      )}
    </ResponsiveModal>
  );
}

/** Returns the count of transactions pending reconciliation review for the current user. */
export function usePendingReviewCount(): { count: number; isLoading: boolean } {
  const { user } = useUser();
  const firestore = useFirestore();

  const expenseQuery = useMemo(() =>
    user && firestore
      ? query(collection(firestore, 'users', user.uid, 'expenses'), where('needsReview', '==', true))
      : null,
    [user, firestore]
  );

  const incomeQuery = useMemo(() =>
    user && firestore
      ? query(collection(firestore, 'users', user.uid, 'incomeSources'), where('needsReview', '==', true))
      : null,
    [user, firestore]
  );

  const { data: expenses, isLoading: eLoading } = useCollection<Expense>(expenseQuery);
  const { data: income, isLoading: iLoading } = useCollection<IncomeSource>(incomeQuery);

  return {
    count: (expenses?.length || 0) + (income?.length || 0),
    isLoading: eLoading || iLoading,
  };
}
