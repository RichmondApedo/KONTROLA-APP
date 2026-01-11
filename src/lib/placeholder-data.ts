// This file is now deprecated as we are using live data from Firestore.
// It is kept for reference but can be removed in the future.
export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  category: string;
  description: string;
};

export const transactions: Transaction[] = [];
