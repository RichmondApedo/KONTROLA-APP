'use server';
/**
 * @fileOverview An AI flow for generating a business-specific demand forecast.
 * Focused on sales velocity, invoice fulfillment, and growth strategies for SMEs.
 */

import { ai, googleAI } from '@/ai/genkit';
import { z } from 'zod';

const BusinessProfileSchema = z.object({
    businessName: z.string().optional(),
    industry: z.string().optional(),
    preferredCurrency: z.string(),
});

const SalesSourceSchema = z.object({
    name: z.string().optional(),
    amount: z.number(),
    date: z.string(),
});

const BusinessExpenseSchema = z.object({
    description: z.string(),
    amount: z.number(),
    category: z.string(),
    date: z.string(),
});

const InvoiceSchema = z.object({
    customerName: z.string(),
    totalAmount: z.number(),
    status: z.string(),
    dueDate: z.string(),
});

const CustomerSchema = z.object({
    name: z.string(),
    totalPurchases: z.number().optional(),
    lastPurchaseDate: z.string().optional(),
});

const DemandForecastInputSchema = z.object({
    profile: BusinessProfileSchema,
    allSales: z.array(SalesSourceSchema),
    businessExpenses: z.array(BusinessExpenseSchema),
    openInvoices: z.array(InvoiceSchema),
    recentCustomers: z.array(CustomerSchema),
});
export type DemandForecastInput = z.infer<typeof DemandForecastInputSchema>;

const DemandForecastOutputSchema = z.object({
    demandCurve: z.array(z.object({
        period: z.string().describe("The time period (e.g., 'Next 30 Days', 'Month 2')."),
        predictedRevenue: z.number().describe("The predicted revenue for this period."),
        confidence: z.string().describe("Confidence level (High/Medium/Low)."),
    })).describe("A 3-period demand projection."),
    seasonalTrends: z.string().describe("Analysis of any identified seasonal or cyclical patterns in the sales data."),
    growthDrivers: z.array(z.string()).describe("Key factors currently driving or hindering demand growth."),
    strategicAdvice: z.array(z.object({
        area: z.string().describe("The business area (e.g., 'Inventory', 'Marketing', 'Collection')."),
        recommendation: z.string().describe("A specific, actionable recommendation."),
    })).describe("Strategic advice to capitalize on predicted demand."),
});
export type DemandForecastOutput = z.infer<typeof DemandForecastOutputSchema>;

const demandPrompt = ai.definePrompt({
  name: 'demandForecastPrompt',
  model: 'googleai/gemini-flash-latest',
  output: {
    format: 'json',
    schema: DemandForecastOutputSchema,
  },
  prompt: `You are an elite Business Strategy AI specializing in SME growth and demand forecasting. Your goal is to analyze a business's sales history and current pipeline to predict future demand and provide strategic growth advice.

Analyze the sales history, open invoices, and customer patterns to generate:
1. **Demand Curve:** Predict revenue for the next 30, 60, and 90 days based on sales velocity and open invoices.
2. **Seasonal Trends:** Identify if the business is entering a peak or trough period.
3. **Growth Drivers:** Highlight which customers or categories are driving the most value.
4. **Strategic Advice:** Provide specific advice on how to manage inventory, speed up collections, or scale operations to meet predicted demand.

Here is the business data:
---
**Business Profile:**
- Name: {{{profile.businessName}}}
- Industry: {{{profile.industry}}}
- Currency: {{{profile.preferredCurrency}}}

**Recent Sales History:**
{{#each allSales}}
- {{name}}: {{amount}} on {{date}}
{{else}}
- No recent sales data.
{{/each}}

**Business Expenses & Overheads:**
{{#each businessExpenses}}
- {{description}} ({{category}}): {{amount}} on {{date}}
{{else}}
- No business expense data.
{{/each}}

**Open & Pending Invoices:**
{{#each openInvoices}}
- Customer: {{customerName}}, Amount: {{totalAmount}}, Status: {{status}}, Due: {{dueDate}}
{{else}}
- No open invoices.
{{/each}}

**Customer Base Overview:**
{{#each recentCustomers}}
- {{name}}: Total Purchases {{totalPurchases}}, Last seen {{lastPurchaseDate}}
{{else}}
- No customer data.
{{/each}}
---

Your response must be grounded in realistic financial logic, especially regarding invoice aging and sales velocity.
`,
});

const generateDemandForecastFlow = ai.defineFlow(
  {
    name: 'generateDemandForecastFlow',
    inputSchema: DemandForecastInputSchema,
    outputSchema: DemandForecastOutputSchema,
  },
  async (input) => {
    try {
      const response = await demandPrompt(input);
      if (!response.output) {
        throw new Error("Neural Engine failed to return structured demand data.");
      }
      return response.output;
    } catch (e: any) {
        console.error("Demand AI Flow Error:", e.message || e);
        throw new Error("The Strategic Advisor is currently processing a high volume of data. Please try again.");
    }
  }
);

export async function generateDemandForecast(input: DemandForecastInput): Promise<DemandForecastOutput> {
    try {
        return await generateDemandForecastFlow(input);
    } catch (error: any) {
        console.error("❌ [Demand Flow Error] generateDemandForecast failed:", error.message || error);
        throw new Error(error.message || "Demand projection temporarily unavailable.");
    }
}
