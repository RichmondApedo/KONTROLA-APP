import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { transactions } from '@/lib/placeholder-data';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

const categoryIcons: Record<string, string> = {
  Salary: "💼",
  Groceries: "🛒",
  Rent: "🏠",
  "Dining Out": "🍔",
  Freelance: "💻",
  Transportation: "🚗",
  Shopping: "🛍️",
  Entertainment: "🎬"
}


export function RecentTransactions() {
    const recent = transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <div className="space-y-8">
      {recent.map((transaction) => (
        <div key={transaction.id} className="flex items-center">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{categoryIcons[transaction.category] || '💸'}</AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{transaction.description}</p>
                <p className="text-sm text-muted-foreground">{transaction.category}</p>
            </div>
            <div className={cn("ml-auto font-medium", transaction.type === 'income' ? 'text-accent-foreground' : 'text-destructive')}>
                {transaction.type === 'income' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
            </div>
        </div>
      ))}
    </div>
  );
}
