
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
    businessName?: string;
    preferredCurrency: string;
    preferredLanguage: string;
    plan: 'free' | 'premium' | 'pro-plus';
    fcmToken?: string;
    notificationsEnabled?: boolean;
    role?: 'admin' | 'user';
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
  totalRevenue?: number;
  lastPurchaseDate?: string | Date;
};

export type InvoiceItem = {
  description: string;
  quantity: number;
  price: number;
};

export type Invoice = {
  id: string;
  userId: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  items: InvoiceItem[];
  totalAmount: number;
  currency: string;
  issueDate: string | Date;
  dueDate: string | Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
};

export type Receipt = {
  id: string;
  userId: string;
  invoiceId?: string;
  customerId: string;
  receiptNumber: string;
  paymentDate: string | Date;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  description?: string;
};
