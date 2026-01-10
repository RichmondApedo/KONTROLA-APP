export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  category: string;
  description: string;
};

export const transactions: Transaction[] = [
  {
    id: '1',
    type: 'income',
    amount: 3500,
    date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    category: 'Salary',
    description: 'Monthly Salary',
  },
  {
    id: '2',
    type: 'expense',
    amount: 85.5,
    date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
    category: 'Groceries',
    description: 'Weekly grocery shopping',
  },
  {
    id: '3',
    type: 'expense',
    amount: 1200,
    date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    category: 'Rent',
    description: 'Monthly rent payment',
  },
  {
    id: '4',
    type: 'expense',
    amount: 45.2,
    date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
    category: 'Dining Out',
    description: 'Dinner with friends',
  },
  {
    id: '5',
    type: 'income',
    amount: 500,
    date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
    category: 'Freelance',
    description: 'Web design project',
  },
  {
    id: '6',
    type: 'expense',
    amount: 25.0,
    date: new Date(new Date().setDate(new Date().getDate() - 4)).toISOString(),
    category: 'Transportation',
    description: 'Gasoline fill-up',
  },
  {
    id: '7',
    type: 'expense',
    amount: 75.0,
    date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString(),
    category: 'Shopping',
    description: 'New clothes',
  },
  {
    id: '8',
    type: 'expense',
    amount: 15.0,
    date: new Date().toISOString(),
    category: 'Entertainment',
    description: 'Movie ticket',
  },
];
