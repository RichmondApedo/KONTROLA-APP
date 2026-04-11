import { formatCurrency, cn } from '@/lib/utils';
import type { CombinedTransaction } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import React from 'react';
import { 
    Utensils, 
    Car, 
    ShoppingBag, 
    Home, 
    Briefcase, 
    CreditCard, 
    Receipt, 
    HeartPulse, 
    Ticket, 
    Church, 
    TrendingUp, 
    Building2,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    LucideIcon
} from 'lucide-react';

interface RecentTransactionsProps {
  transactions: CombinedTransaction[];
  isLoading: boolean;
}

const getIconForTransaction = (transaction: CombinedTransaction): { icon: LucideIcon, color: string } => {
    const description = transaction.description.toLowerCase();
    const category = transaction.category.toLowerCase();

    if (category.includes('food') || description.includes('food') || description.includes('lunch') || description.includes('restaurant') || category.includes('groceries')) 
        return { icon: Utensils, color: 'text-orange-500' };
    if (category.includes('transport') || description.includes('uber') || description.includes('bolt') || description.includes('fuel') || description.includes('bus')) 
        return { icon: Car, color: 'text-blue-500' };
    if (category.includes('shopping') || description.includes('shopping') || description.includes('clothing')) 
        return { icon: ShoppingBag, color: 'text-pink-500' };
    if (category.includes('rent') || description.includes('rent')) 
        return { icon: Home, color: 'text-indigo-500' };
    if (category.includes('salary') || description.includes('salary')) 
        return { icon: Briefcase, color: 'text-emerald-500' };
    if (category.includes('payment') || description.includes('payment')) 
        return { icon: CreditCard, color: 'text-slate-500' };
    if (category.includes('bill') || description.includes('bill') || description.includes('subscription') || description.includes('netflix') || description.includes('spotify')) 
        return { icon: Receipt, color: 'text-amber-500' };
    if (category.includes('health') || description.includes('health') || description.includes('pharmacy') || description.includes('doctor')) 
        return { icon: HeartPulse, color: 'text-rose-500' };
    if (category.includes('entertainment') || description.includes('entertainment') || description.includes('movie') || description.includes('concert')) 
        return { icon: Ticket, color: 'text-purple-500' };
    if (category.includes('church') || description.includes('church') || description.includes('offering') || description.includes('tithe')) 
        return { icon: Church, color: 'text-amber-600' };
    if (category.includes('investment') || description.includes('investment')) 
        return { icon: TrendingUp, color: 'text-cyan-500' };
    if (category.includes('business') || description.includes('business') || description.includes('office')) 
        return { icon: Building2, color: 'text-primary' };

    return transaction.type === 'income' 
        ? { icon: ArrowUpRight, color: 'text-emerald-500' } 
        : { icon: ArrowDownRight, color: 'text-destructive' };
};

export function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
      return <div className="text-center text-muted-foreground py-12 font-medium bg-muted/5 rounded-3xl border border-dashed border-border/40">No recent activity logged.</div>
  }

  return (
    <div className="space-y-4">
      {transactions.map(transaction => {
        const { icon: Icon, color } = getIconForTransaction(transaction);
        const isIncome = transaction.type === 'income';

        return (
          <div key={transaction.id} className="group flex items-center py-3 border-b border-border/10 last:border-0 hover:bg-muted/5 transition-colors overflow-hidden px-1">
            
            {/* LEFT SECTION (Icon) */}
            <div className={cn(
                "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-opacity-10 mr-3.5 relative",
                isIncome ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
            )}>
                <Icon className="h-[22px] w-[22px]" />
            </div>
            
            {/* MIDDLE SECTION (Truncating Context) */}
            <div className="flex-1 min-w-0 overflow-hidden pr-3">
                <p className="text-[13px] sm:text-sm font-black tracking-tight text-foreground truncate group-hover:text-primary transition-colors">
                    {transaction.description}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 truncate">{transaction.category}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 italic shrink-0">
                        • {transaction.context === 'business' ? 'BIZ' : 'PERS'}
                    </span>
                </div>
            </div>

            {/* RIGHT SECTION (Amount) */}
            <div className={cn(
                "shrink-0 text-right whitespace-nowrap font-black tracking-tighter text-sm sm:text-[15px]",
                isIncome ? "text-emerald-500" : "text-destructive"
            )}>
                <span className="opacity-50 text-[10px] mr-1 font-bold">{isIncome ? '+' : '-'}</span>
                {formatCurrency(transaction.amount, transaction.currency)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
