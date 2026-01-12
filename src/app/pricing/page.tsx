
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const plans = [
  {
    name: 'Free',
    price: '₵0',
    features: [
      'Manual expense tracking',
      'Basic budget categories',
      'Monthly spending summary',
      'Simple alerts',
    ],
    buttonText: 'Get Started',
    buttonVariant: 'secondary' as const,
  },
  {
    name: 'Premium',
    price: '₵25 / month',
    features: [
      'Automatic Bank & MoMo sync',
      'AI spending insights',
      'Savings goals',
      'Bill tracking',
      'PDF & Excel reports',
      'Priority support',
    ],
    buttonText: 'Upgrade',
    buttonVariant: 'default' as const,
    popular: true,
  },
  {
    name: 'Pro Plus',
    price: '₵50 / month',
    features: [
      'Multi-account management',
      'Advanced forecasts',
      'Debt & loan tracking',
      'Financial health score',
      '1-on-1 money coaching',
    ],
    buttonText: 'Go Pro',
    buttonVariant: 'default' as const,
  },
];

export default function PricingPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="container mx-auto px-4 py-10 text-center sm:px-6 lg:px-8 lg:py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Kontrola Pricing
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Take control of your money. Choose a plan that fits you.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-xl border bg-card p-8 shadow-sm',
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
                {plan.price}
              </div>
              <ul className="mt-6 space-y-4 text-left">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className="h-6 w-6 flex-shrink-0 text-primary" />
                    <span className="ml-3 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <Button size="lg" className="w-full" variant={plan.buttonVariant}>
                  {plan.buttonText}
                </Button>
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
