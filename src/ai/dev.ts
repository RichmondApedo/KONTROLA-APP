'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/personalized-financial-insights.ts';
import '@/ai/flows/expense-category-suggestions.ts';
import '@/ai/flows/verify-payment-flow.ts';
import '@/ai/flows/bill-reminder-flow.ts';
import '@/ai/flows/advanced-financial-forecast.ts';
import '@/ai/flows/link-account-flow.ts';
