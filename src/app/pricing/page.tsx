'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaystackPaymentButton } from '@/components/paystack-payment-button';
import { useMemo, useState, useEffect } from 'react';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

// This contains the UI information for each plan, like features and name.
// The pricing data will be fetched from Paystack and merged with this.
const uiPlans = [
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
    planKey: 'premium' as const,
    // IMPORTANT: This code must exactly match the "Plan Code" in your Paystack Dashboard.
    planCode: 'PLN_KONTROLA_PREMIUM', 
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
    planKey: 'pro-plus' as const,
    // IMPORTANT: This code must exactly match the "Plan Code" in your Paystack Dashboard.
    planCode: 'PLN_KONTROLA_PROPLUS', 
  },
];

type PaystackPlan = {
    id: number;
    name: string;
    amount: number; // in cents/kobo
    currency: string;
    plan_code: string;
}

export default function PricingPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [paystackPlans, setPaystackPlans] = useState<PaystackPlan[]>([]);
  const [arePlansLoading, setArePlansLoading] = useState(true);

  useEffect(() => {
    fetch('/api/paystack/plans')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          setPaystackPlans(data);
        }
      })
      .catch(err => {
        console.error("Failed to fetch Paystack plans:", err);
      })
      .finally(() => {
        setArePlansLoading(false);
      });
  }, []);

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);

  const isLoading = isUserLoading || isProfileLoading;
  const userEmail = profile?.email || user?.email || '';

  const displayPlans = useMemo(() => {
    return uiPlans.map(uiPlan => {
        if (uiPlan.planKey === 'free') {
            return {
                ...uiPlan,
                price: 0,
                priceText: 'Free',
                currency: 'GHS',
                disabled: false,
            }
        }
        const paystackPlan = paystackPlans.find(p => p.plan_code === uiPlan.planCode);

        if (paystackPlan) {
            return {
                ...uiPlan,
                price: paystackPlan.amount, // This is in kobo/cents
                priceText: `${formatCurrency(paystackPlan.amount / 100, paystackPlan.currency)} / month`,
                currency: paystackPlan.currency,
                disabled: false,
            }
        }

        return {
            ...uiPlan,
            price: 0,
            priceText: 'Not Available',
            currency: 'GHS',
            disabled: true,
        }
    })
  }, [paystackPlans]);


  if (arePlansLoading) {
    return (
        <div className="bg-background text-foreground min-h-screen">
            <div className="container mx-auto px-4 py-10 text-center sm:px-6 lg:px-8 lg:py-16">
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-primary">
                Find the Right Plan For You
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Loading plans from Paystack...
                </p>
                <div className="mt-12 grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-[450px] w-full rounded-xl" />
                    <Skeleton className="h-[450px] w-full rounded-xl" />
                    <Skeleton className="h-[450px] w-full rounded-xl" />
                </div>
            </div>
        </div>
    )
  }

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
                    buttonText={profile?.plan === plan.planKey ? 'Current Plan' : (plan.disabled ? 'Not Available' : plan.buttonText)}
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
