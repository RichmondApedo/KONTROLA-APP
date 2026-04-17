'use client';

export type IncomeSource = {
  id: string;
  userId: string;
  name: string;
  description?: string;
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
  fuelLiters?: number;
  fuelPricePerUnit?: number;
  station?: string;
  odometer?: number;
  fuelVehicleName?: string;
  fuelIsFullTank?: boolean;
  fuelType?: string;
  maintenanceOdometerMark?: number;
};

export type CombinedTransaction = ((IncomeSource & { type: 'income' }) | (Expense & { type: 'expense' })) & { description: string };

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
    email?: string | null;
    phone?: string | null;
    firstName?: string;
    lastName?: string;
    businessName?: string;
    preferredCurrency: string;
    preferredLanguage: string;
    plan: 'free' | 'premium' | 'pro-plus';
    fcmToken?: string;
    notificationsEnabled?: boolean;
    role?: 'admin' | 'user' | 'auditor';
    paymentReference?: string;
    paystackPlanCode?: string;
    paystackCustomerCode?: string;
    paystackSubscriptionCode?: string;
    subscriptionStatus?: 'active' | 'inactive' | 'non-renewing';
    subscriptionExpiry?: Date | null;
    mfaEnabled?: boolean;
    mfaPhone?: string | null;
    ownerUid?: string;
    incomeDate?: number;
};

export type SavingsGoal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  lastContributionDate?: string | Date;
  lastReminderSentAt?: string | Date;
  isChallenge?: boolean;
  challengePeriod?: 'daily' | 'weekly' | 'monthly';
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
  context?: 'personal' | 'business';
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
  amountPaid: number;
  currency: string;
  issueDate: string | Date;
  dueDate: string | Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'partially_paid';
  customerPhone?: string;
};

export type Vendor = {
  id: string;
  userId: string;
  name: string;
  category?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: string | Date;
  totalOwed?: number;
};

export type Receipt = {
  id: string;
  userId: string;
  invoiceId?: string;
  customerId: string;
  customerName: string;
  receiptNumber: string;
  paymentDate: string | Date;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  description?: string;
  customerPhone?: string;
};

export type BusinessInvitation = {
  id: string;
  ownerUid: string;
  ownerEmail: string;
  targetEmail: string;
  targetUid?: string | null;
  accessLevel: 'viewer' | 'editor' | 'owner' | 'auditor';
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string | Date;
};

export type BusinessAccess = {
  id: string; // matches ownerUid
  ownerUid: string;
  ownerEmail: string;
  accessLevel: 'viewer' | 'editor' | 'owner' | 'auditor';
  grantedAt: string | Date;
};

export type ShoppingListItem = {
  itemId: string;
  itemName: string;
  quantity: string;
  estimatedPrice: number;
  status: 'pending' | 'purchased';
};

export type ShoppingList = {
  id: string;
  userId: string;
  heading: string;
  createdAt: string | Date;
  items: ShoppingListItem[];
};
