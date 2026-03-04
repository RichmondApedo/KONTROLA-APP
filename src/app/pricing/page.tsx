'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaystackPaymentButton } from '@/components/paystack-payment-button';
import { useMemo } from 'react';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { SUBSCRIPTION_PLANS } from '@/lib/plans';

// This now contains all UI and subscription data.
const displayPlans = [
  {
    name: 'Free',
    features: [
      'Manual income & expense tracking',
      'View financial reports (no export)',
      'Connect bank accounts for auto-sync',
      'Basic AI-powered insights',
    ],
    buttonText: 'Get Started',
    buttonVariant: 'secondary' as const,
    popular: false,
    planKey: 'free' as const,
    planCode: '',
    price: 0,
    priceText: 'Free',
    currency: 'GHS',
    disabled: false,
  },
  {
    name: 'Premium',
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
    planKey: SUBSCRIPTION_PLANS.PREMIUM.key,
    planCode: SUBSCRIPTION_PLANS.PREMIUM.planCode,
    price: SUBSCRIPTION_PLANS.PREMIUM.price,
    priceText: `${formatCurrency(SUBSCRIPTION_PLANS.PREMIUM.price / 100, SUBSCRIPTION_PLANS.PREMIUM.currency)} / ${SUBSCRIPTION_PLANS.PREMIUM.interval}`,
    currency: SUBSCRIPTION_PLANS.PREMIUM.currency,
    disabled: false,
  },
  {
    name: 'Pro Plus',
    features: [
      'All Premium features, plus:',
      'Separate Business Dashboard',
      'Customer, invoice & receipt management',
      'Advanced AI financial forecasting',
      'Priority support',
    ],
    buttonText: 'Go Pro',
    buttonVariant: 'default' as const,
    popular: false,
    planKey: SUBSCRIPTION_PLANS.PRO_PLUS.key,
    planCode: SUBSCRIPTION_PLANS.PRO_PLUS.planCode,
    price: SUBSCRIPTION_PLANS.PRO_PLUS.price,
    priceText: `${formatCurrency(SUBSCRIPTION_PLANS.PRO_PLUS.price / 100, SUBSCRIPTION_PLANS.PRO_PLUS.currency)} / ${SUBSCRIPTION_PLANS.PRO_PLUS.interval}`,
    currency: SUBSCRIPTION_PLANS.PRO_PLUS.currency,
    disabled: false,
  },
];


export default function PricingPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);

  const isLoading = isUserLoading || isProfileLoading;
  const userEmail = profile?.email || user?.email || '';

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
          {displayPlans.map((plan) => (
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
                {isLoading ? (
                  <Skeleton className="h-11 w-full rounded-md" />
                ) : (
                  <PaystackPaymentButton
                    plan={plan.planKey}
                    planCode={plan.planCode}
                    buttonText={profile?.plan === plan.planKey ? 'Current Plan' : plan.buttonText}
                    buttonVariant={plan.buttonVariant}
                    userEmail={userEmail}
                    currency={plan.currency}
                    disabled={plan.planKey === 'free' || profile?.plan === plan.planKey || !!plan.disabled}
                  />
                )}
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
