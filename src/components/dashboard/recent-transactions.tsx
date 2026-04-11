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
          <div key={transaction.id} className="group flex items-center justify-between gap-2 sm:gap-4 p-0.5 rounded-2xl hover:bg-muted/5 transition-all duration-300">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                <div className={cn(
                    "flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border border-border/10 shadow-inner relative overflow-hidden transition-transform group-hover:scale-110",
                    isIncome ? "bg-emerald-500/5" : "bg-destructive/5"
                )}>
                    <div className={cn("absolute inset-0 opacity-20 blur-sm", isIncome ? "bg-emerald-500" : "bg-destructive")} />
                    <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5 relative z-10", color)} />
                </div>
                
                <div className="flex-1 min-w-0 pr-1 sm:pr-2">
                    <p className="text-[12px] sm:text-sm font-black tracking-tight text-foreground truncate group-hover:text-primary transition-colors">
                        {transaction.description}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 truncate max-w-[60px] sm:max-w-none">{transaction.category}</span>
                        <div className="h-0.5 w-0.5 rounded-full bg-border shrink-0" />
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 italic truncate shrink-0">
                            {transaction.context === 'business' ? 'Biz' : 'Pers'}
                        </span>
                    </div>
                </div>
            </div>

            <div className={cn(
                "shrink-0 font-black tracking-tighter text-[13px] sm:text-base selection:bg-primary/20",
                isIncome ? "text-emerald-500" : "text-destructive"
            )}>
                <div className="flex items-center gap-0.5 whitespace-nowrap">
                    <span className="opacity-50 text-[9px] sm:text-[10px] mr-0.5 font-bold">{isIncome ? '+' : '-'}</span>
                    {formatCurrency(transaction.amount, transaction.currency)}
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
