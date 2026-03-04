/**
 * Defines the subscription plans available in the application.
 * IMPORTANT: The `planCode` values must match the plan codes in your Paystack dashboard exactly.
 * You can find or create these in your Paystack settings under "Plans".
 */
export const SUBSCRIPTION_PLANS = {
  PREMIUM: {
    key: 'premium' as const,
    name: "Premium",
    price: 2500, // 25 GHS in kobo
    currency: 'GHS',
    planCode: "PLN_premiumxxxx",
  },
  PRO_PLUS: {
    key: 'pro-plus' as const,
    name: "Pro Plus",
    price: 5000, // 50 GHS in kobo
    currency: 'GHS',
    planCode: "PLN_proplusxxxx",
  },
};
