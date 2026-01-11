export type IncomeSource = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
};

export type Expense = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  description: string;
};

export type Budget = {
    id: string;
    userId: string;
    name: string;
    amount: number;
    category: string;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: string;
    endDate: string;
    currency: string;
};

export type UserProfile = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    preferredCurrency: string;
    preferredLanguage: string;
    points?: number;
};
