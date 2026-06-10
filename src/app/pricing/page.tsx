'use client';

import { Check, ArrowLeft, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';

const PaystackPaymentButton = dynamic(
  () => import('@/components/paystack-payment-button').then((mod) => mod.PaystackPaymentButton),
  { ssr: false }
);
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useUser, useUserProfile } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { SUBSCRIPTION_PLANS } from '@/lib/plans';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const [isPaystackConfigured, setIsPaystackConfigured] = useState(true);
  const [paystackKey, setPaystackKey] = useState<string | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isActivatingTrial, setIsActivatingTrial] = useState(false);

  useEffect(() => {
    async function fetchPaystackConfig() {
      // Don't attempt fetch if we're still loading the user session
      if (isUserLoading) return;

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // If user is logged in, attach their token to satisfy the API security check
        if (user) {
          const token = await user.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/paystack-key', { headers });
        const data = await res.json();

        if (data && data.publicKey) {
          setIsPaystackConfigured(true);
          setPaystackKey(data.publicKey);
        } else {
          setIsPaystackConfigured(false);
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Pricing] Paystack key missing or invalid:', data.error || 'Unknown error');
          }
        }
      } catch (err: any) {
        console.error('[Pricing] Configuration fetch failed:', err);
        setIsPaystackConfigured(false);
      } finally {
        setIsConfigLoading(false);
      }
    }

    fetchPaystackConfig();
  }, [user, isUserLoading]);

  const isLoading = isUserLoading || isProfileLoading || isConfigLoading;
  const userEmail = profile?.email || user?.email || '';

  // Trial eligibility: logged in, on free plan, and has not used their trial yet
  const isTrialEligible =
    !!user && profile?.plan === 'free' && profile?.trialUsed !== true;
  const hasUsedTrial = !!user && profile?.trialUsed === true;
  const isOnTrial =
    profile?.plan === 'pro-plus' &&
    profile?.paystackSubscriptionCode === 'FREE_TRIAL';

  const handleActivateTrial = useCallback(async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setIsActivatingTrial(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/trial/activate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Trial activation failed.');

      toast({
        title: '🎉 Trial Activated!',
        description: 'Your 30-day Business Suite trial is now active. Enjoy full Pro Plus access!',
      });
      router.refresh();
      router.push('/dashboard');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Activation Failed',
        description: err.message,
      });
      setIsActivatingTrial(false);
    }
  }, [user, router, toast]);

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

        {!isPaystackConfigured && !isLoading && (
            <Alert variant="destructive" className="my-8 max-w-2xl mx-auto text-left border-destructive/50 bg-destructive/5">
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Subscription Service Temporarily Unavailable</AlertTitle>
                <AlertDescription>
                    We are currently performing maintenance on our payment gateway. Pricing information and upgrades are temporarily disabled. Please try again in a few minutes.
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

              <div className="mt-10 space-y-3">
                {isLoading ? (
                  <Skeleton className="h-12 w-full rounded-xl" />
                ) : (
                  <>
                    {/* Free trial CTA — only shown for Pro Plus to eligible users */}
                    {plan.planKey === 'pro-plus' && (
                      isOnTrial ? (
                        <div className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-bold text-amber-600">Trial Active</span>
                        </div>
                      ) : isTrialEligible ? (
                        <Button
                          size="lg"
                          className="w-full gap-2 bg-gradient-to-r from-violet-600 to-primary hover:opacity-90 transition-opacity font-bold shadow-lg"
                          onClick={handleActivateTrial}
                          disabled={isActivatingTrial}
                        >
                          {isActivatingTrial
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Activating...</>
                            : <><Sparkles className="h-4 w-4" /> Start 30-Day Free Trial</>}
                        </Button>
                      ) : hasUsedTrial ? (
                        <p className="text-center text-xs text-muted-foreground pb-1">
                          Trial already used on this account
                        </p>
                      ) : null
                    )}

                    <PaystackPaymentButton
                      plan={plan.planKey}
                      planCode={plan.planCode}
                      amount={plan.price}
                      buttonText={
                        profile?.plan === plan.planKey
                          ? (profile?.subscriptionStatus === 'active' ? 'Current Plan' : 'Renew Plan')
                          : plan.planKey === 'pro-plus' && (isTrialEligible || isOnTrial)
                            ? 'Or Subscribe Now'
                            : plan.buttonText
                      }
                      buttonVariant={
                        plan.planKey === 'pro-plus' && (isTrialEligible || isOnTrial)
                          ? 'outline'
                          : plan.buttonVariant
                      }
                      userEmail={userEmail}
                      currency={plan.currency}
                      publicKey={paystackKey}
                      disabled={
                        plan.planKey === 'free' ||
                        (profile?.plan === plan.planKey &&
                          profile?.subscriptionStatus === 'active' &&
                          !isOnTrial) ||
                        !!plan.disabled ||
                        !isPaystackConfigured
                      }
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center space-y-4 border-t pt-8">
          {/* Recurring billing disclosure — required by Paystack & Apple Guideline 5.1.1 */}
          <div className="max-w-2xl mx-auto rounded-xl border border-primary/10 bg-primary/5 p-4 text-xs text-muted-foreground space-y-2">
            <p className="font-bold text-foreground/80 uppercase tracking-widest text-[10px]">Subscription Disclosure</p>
            <p>
              Paid plans are billed automatically every <strong>30 days</strong> (Premium: GHS 25.00 · Pro Plus: GHS 50.00).
              Payment is charged to your selected method at confirmation. Subscriptions renew automatically unless cancelled
              at least 24 hours before the renewal date via <strong>Settings → Subscription</strong>.
              No refunds are issued for the current billing period after a charge has been processed.
            </p>
            <p>
              By subscribing you agree to our{' '}
              <a href="/terms" className="text-primary underline underline-offset-2 font-semibold">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="text-primary underline underline-offset-2 font-semibold">Privacy Policy</a>,
              and to <a href="https://paystack.com/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 font-semibold">Paystack&apos;s Terms</a>.
            </p>
          </div>
          <p className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Secured by Paystack</span>
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
