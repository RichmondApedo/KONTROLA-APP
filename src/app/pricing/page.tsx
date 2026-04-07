'use client';

import { Check, Terminal, ArrowLeft, ShieldCheck } from 'lucide-react';
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
      'Basic strategic insights',
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
      'Advanced financial forecasting',
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
    // Check if the key is already available via NEXT_PUBLIC prefix (direct from env)
    const clientKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (clientKey && clientKey !== 'your_paystack_public_key_here') {
      setIsPaystackConfigured(true);
      setIsConfigLoading(false);
      return;
    }

    // Otherwise, fetch from the API route (server-side verification)
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
    <div className="bg-background text-foreground min-h-screen relative overflow-hidden">
      {/* Premium Background Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-primary/5 via-transparent to-transparent -z-10" />
      
      <div className="container px-4 pt-8 pb-32 sm:px-6 lg:px-8 max-w-7xl">
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

        {/* Pricing Header - Fixed Div Closure */}
        <div className="text-center py-2 lg:pt-8 lg:pb-12">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-primary mb-4">
                Find the Right Plan For You
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
                Start for free, or choose a plan with the features that fit your financial goals.
            </p>
        </div>

        {!isPaystackConfigured && (
            <Alert variant="destructive" className="my-8 max-w-2xl mx-auto text-left border-destructive/50 bg-destructive/5">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Payment System Not Configured</AlertTitle>
                <AlertDescription>
                    Payments are currently disabled. To enable them, please add your{' '}
                    <code>PAYSTACK_PUBLIC_KEY</code> and <code>PAYSTACK_SECRET_KEY</code>{' '}
                    to the <code>.env</code> file in the project root.
                </AlertDescription>
            </Alert>
        )}

        {/* Plan Grid - Now 3-Column on Mid and above */}
        <div className="mt-8 grid gap-8 grid-cols-1 md:grid-cols-3 items-stretch">
          {displayPlans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-2xl border bg-card/50 backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl group',
                plan.popular ? 'border-primary shadow-lg ring-1 ring-primary/20 scale-105 z-10' : 'border-border'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-6 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm animate-pulse">
                  Most Popular
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-muted-foreground uppercase tracking-widest">{plan.name}</h3>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-primary">
                        {isPaystackConfigured ? plan.priceText.split(' / ')[0] : 'Unavailable'}
                    </span>
                    {isPaystackConfigured && plan.price > 0 && (
                        <span className="text-sm font-semibold text-muted-foreground">
                            /{plan.priceText.split(' / ')[1]}
                        </span>
                    )}
                </div>
              </div>

              <ul className="space-y-4 text-left flex-grow">
                {plan.features.map((feature, index) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className={cn(
                        "mt-1 p-0.5 rounded-full",
                        index === 0 && (plan.name === 'Premium' || plan.name === 'Pro Plus') ? "bg-transparent" : "bg-primary/10"
                    )}>
                        <Check className={cn(
                            "h-3.5 w-3.5",
                            index === 0 && (plan.name === 'Premium' || plan.name === 'Pro Plus') ? 'text-transparent' : 'text-primary'
                        )} />
                    </div>
                    <span className={cn(
                        "text-sm leading-tight text-foreground/80", 
                        index === 0 && (plan.name === 'Premium' || plan.name === 'Pro Plus') ? 'font-bold text-primary' : ''
                    )}>
                        {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                {isLoading ? (
                  <Skeleton className="h-12 w-full rounded-xl" />
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

        <div className="mt-20 text-center text-sm text-muted-foreground border-t pt-8">
          <p className="flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Bank-level security</span>
            <span className="opacity-30">•</span>
            <span>Cancel anytime</span>
            <span className="opacity-30">•</span>
            <span>Your data is never sold</span>
          </p>
        </div>
      </div>
    </div>
  );
}
