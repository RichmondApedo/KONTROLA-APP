export type IncomeSource = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  date: string | Date;
  category: string;
  context?: 'personal' | 'business';
};

export type Expense = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  date: string | Date;
  category: string;
  description: string;
  context?: 'personal' | 'business';
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
    lastNotificationSent?: 'warning' | 'exceeded';
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
    fcmToken?: string;
    notificationsEnabled?: boolean;
};

export type SavingsGoal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
};

export type Bill = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  dueDate: string | Date;
  status: 'paid' | 'unpaid';
  isRecurring: boolean;
};

export type LinkedAccount = {
  id: string;
  userId: string;
  institutionName: string;
  accountName: string;
  accountNumber: string;
  accountType: string;
  balance: number;
  currency: string;
};

export type HomeBanner = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  active: boolean;
  order: number;
};

export type Customer = {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: string | Date;
};

export type Invoice = {
  id: string;
  userId: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  currency: string;
  issueDate: string | Date;
  dueDate: string | Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
};

    