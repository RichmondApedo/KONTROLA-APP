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
    LucideIcon,
    Activity,
    Info,
    CheckCircle2,
    Zap
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
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4 bg-muted/5 rounded-[2rem] border border-dashed border-border/40">
              <div className="h-14 w-14 rounded-3xl bg-muted/10 flex items-center justify-center">
                  <Info className="h-7 w-7 text-muted-foreground/20" />
              </div>
              <div className="space-y-1">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/40">Ledger Empty</p>
                  <p className="text-xs font-medium text-muted-foreground/30 italic">Initialize your first checkpoint to begin tracking.</p>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-1 relative">
      {/* Temporal Center Line (Desktop only decor) */}
      <div className="absolute left-[23px] top-6 bottom-6 w-px bg-gradient-to-b from-primary/20 via-primary/5 to-transparent hidden sm:block" />
      
      {transactions.map(transaction => {
        const { icon: Icon, color } = getIconForTransaction(transaction);
        const isIncome = transaction.type === 'income';

        return (
          <div key={transaction.id} className="group relative flex items-center gap-4 p-3.5 rounded-[1.5rem] transition-all duration-500 hover:bg-primary/[0.03] active:scale-[0.98] border border-transparent hover:border-primary/10 overflow-hidden">
            
            {/* Status Glow (Hidden until hover) */}
            <div className={`absolute inset-0 bg-gradient-to-r ${isIncome ? 'from-emerald-500/5' : 'from-primary/5'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

            {/* LEFT SECTION (Icon) */}
            <div className={cn(
                "relative z-10 flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl shadow-premium transition-transform group-hover:scale-110 duration-500",
                isIncome 
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                    : "bg-background/80 text-foreground border border-border/40 group-hover:border-primary/30"
            )}>
                <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6 transition-colors", !isIncome && "group-hover:text-primary")} />
                {isIncome && <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />}
            </div>
            
            {/* MIDDLE SECTION (Main Info) */}
            <div className="relative z-10 flex-1 min-w-0">
                <p className="text-[13px] sm:text-[15px] font-black tracking-tight text-foreground truncate group-hover:text-primary transition-colors leading-tight mb-0.5">
                    {transaction.description}
                </p>
                <div className="flex items-center gap-1.5 overflow-hidden translate-y-[1px]">
                    <span className="text-[8.5px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 truncate">
                        {transaction.category}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/20 shrink-0" />
                    <span className="text-[8.5px] sm:text-[10px] font-black uppercase tracking-widest text-primary/40 italic shrink-0">
                        {transaction.context === 'business' ? 'BIZ' : 'PERS'}
                    </span>
                </div>
            </div>

            {/* RIGHT SECTION (Amount) */}
            <div className="relative z-10 shrink-0 text-right pl-2">
                <div className={cn(
                    "font-black tracking-tighter text-[15px] sm:text-[17px] leading-none mb-1",
                    isIncome ? "text-emerald-500" : "text-foreground group-hover:text-primary transition-colors"
                )}>
                    {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
                </div>
                <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 translate-y-[-1px]">
                   {transaction.date ? new Date((transaction.date as any).toDate ? (transaction.date as any).toDate() : transaction.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Checkpoint'}
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
