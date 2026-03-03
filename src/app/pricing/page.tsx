'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaystackPaymentButton } from '@/components/paystack-payment-button';

const plans = [
  {
    name: 'Free',
    price: 0,
    priceUnit: '₵',
    priceText: 'Free',
    features: [
      'Manual income & expense tracking',
      'View financial reports (no export)',
      'Connect bank accounts for auto-sync',
      'Basic AI-powered insights',
    ],
    buttonText: 'Get Started',
    buttonVariant: 'secondary' as const,
    planKey: 'free',
  },
  {
    name: 'Premium',
    price: 25,
    priceUnit: '₵',
    priceText: 'GH₵25 / month',
    features: [
      'All Free features, plus:',
      'Create & manage budgets',
      'Set & track savings goals',
      'Track bills & get payment reminders',
      'Export reports to PDF & Excel',
    ],
    buttonText: 'Upgrade',
    buttonVariant: 'default' as const,
    popular: true,
    planKey: 'premium' as const,
  },
  {
    name: 'Pro Plus',
    price: 50,
    priceUnit: '₵',
    priceText: 'GH₵50 / month',
    features: [
      'All Premium features, plus:',
      'Separate Business Dashboard',
      'Customer, invoice & receipt management',
      'Advanced AI financial forecasting',
      'Priority support',
    ],
    buttonText: 'Go Pro',
    buttonVariant: 'default' as const,
    planKey: 'pro-plus' as const,
  },
];

export default function PricingPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="container mx-auto px-4 py-10 text-center sm:px-6 lg:px-8 lg:py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-primary">
          Find the Right Plan For You
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Start for free, or choose a plan with the features that fit your financial goals.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-xl border bg-card p-8 shadow-sm text-center',
                plan.popular ? 'border-2 border-primary' : 'border-border'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-semibold">{plan.name}</h3>
              <div className="mt-4 text-4xl font-bold text-primary">
                {plan.priceText}
              </div>
              <ul className="mt-6 space-y-4 text-left">
                {plan.features.map((feature, index) => (
                  <li key={feature} className="flex items-start">
                    <Check className={cn("h-6 w-6 flex-shrink-0", index === 0 && (plan.name === 'Premium' || plan.name === 'Pro Plus') ? 'text-transparent' : 'text-primary')} />
                    <span className={cn("ml-3 text-sm", index === 0 && (plan.name === 'Premium' || plan.name === 'Pro Plus') ? 'font-semibold' : '')}>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <PaystackPaymentButton
                    plan={plan.planKey}
                    amountInKobo={plan.price * 100}
                    buttonText={plan.buttonText}
                    buttonVariant={plan.buttonVariant}
                    disabled={plan.planKey === 'free'}
                 />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-sm text-muted-foreground">
          <p>🔒 Bank-level security • Cancel anytime • Your data is never sold</p>
        </div>
      </div>
    </div>
  );
}
