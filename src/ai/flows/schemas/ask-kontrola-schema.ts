'use server';
/**
 * @fileOverview Zod schemas for the Ask Kontrola flow.
 */
import { z } from 'zod';

// Define schemas for financial data types to be passed to the prompt
const UserProfileSchema = z.object({
    firstName: z.string().optional(),
    plan: z.string(),
    preferredCurrency: z.string(),
});

const IncomeSourceSchema = z.object({
    name: z.string(),
    amount: z.number(),
    date: z.string(),
});

const ExpenseSchema = z.object({
    description: z.string(),
    amount: z.number(),
    category: z.string(),
    date: z.string(),
});

const BudgetSchema = z.object({
    name: z.string(),
    amount: z.number(),
    period: z.string(),
    category: z.string(),
});

const SavingsGoalSchema = z.object({
    name: z.string(),
    currentAmount: z.number(),
    targetAmount: z.number(),
});

// The main input schema for the flow
export const askKontrolaSchema = z.object({
    question: z.string().describe("The user's question."),
    currentDate: z.string().describe("The current date, to provide context to the AI."),
    profile: UserProfileSchema.describe("The user's profile information."),
    income: z.array(IncomeSourceSchema).describe("A list of the user's recent income sources."),
    expenses: z.array(ExpenseSchema).describe("A list of the user's recent expenses."),
    budgets: z.array(BudgetSchema).describe("A list of the user's active budgets."),
    savingsGoals: z.array(SavingsGoalSchema).describe("A list of the user's savings goals."),
});

export type AskKontrolaInput = z.infer<typeof askKontrolaSchema>;
