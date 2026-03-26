'use client';

import { Check, Terminal, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';

const PaystackPaymentButton = dynamic(
  () => import('@/components/paystack-payment-button').then((mod) => mod.PaystackPaymentButton),
  { ssr: false }
);
import { useMemo, useState, useEffect } from 'react';
import { useUser, useUserProfile } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { SUBSCRIPTION_PLANS } from '@/lib/plans';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const { profile, isProfileLoading } = useUserProfile();
  const router = useRouter();

  const [isPaystackConfigured, setIsPaystackConfigured] = useState(true);
  const [isConfigLoading, setIsConfigLoading] = useState(true);

  useEffect(() => {
    fetch('/api/paystack-key')
      .then(res => res.json())
      .then(data => {
        if (!data || !data.publicKey) {
          setIsPaystackConfigured(false);
        }
      })
      .catch(() => {
        setIsPaystackConfigured(false);
      })
      .finally(() => {
        setIsConfigLoading(false);
      });
  }, []);

  const isLoading = isUserLoading || isProfileLoading || isConfigLoading;
  const userEmail = profile?.email || user?.email || '';

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex justify-start mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Go Back
          </Button>
        </div>
        <div className="text-center py-2 lg:py-8">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-primary">
          Find the Right Plan For You
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Start for free, or choose a plan with the features that fit your financial goals.
        </p>

        {!isPaystackConfigured && (
            <Alert variant="destructive" className="my-8 max-w-2xl mx-auto text-left">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Payment System Not Configured</AlertTitle>
            <AlertDescription>
                Payments are currently disabled. To enable them, please add your{' '}
                <code>NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY</code> and <code>PAYSTACK_SECRET_KEY</code>{' '}
                to the <code>.env</code> file in the project root and then restart the server.
            </AlertDescription>
            </Alert>
        )}

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
                {isPaystackConfigured ? plan.priceText : 'Unavailable'}
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
                    disabled={plan.planKey === 'free' || profile?.plan === plan.planKey || !!plan.disabled || !isPaystackConfigured}
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
