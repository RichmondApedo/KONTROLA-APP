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
    startDate: Date;
    endDate: Date;
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
    plan: 'free' | 'premium' | 'pro-plus';
};

export type SavingsGoal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currency: string;
};

export type Bill = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'paid' | 'unpaid';
  isRecurring: boolean;
};
