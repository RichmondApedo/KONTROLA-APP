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
