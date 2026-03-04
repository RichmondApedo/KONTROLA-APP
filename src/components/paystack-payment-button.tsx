'use client';

import { usePaystackPayment } from 'react-paystack';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { verifyPaymentAndUpdatePlan } from '@/ai/flows/verify-payment-flow';
import type { VerifyPaymentOutput } from '@/ai/flows/verify-payment-flow';
import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';

interface PaystackPaymentButtonProps {
  plan: 'free' | 'premium' | 'pro-plus';
  amountInKobo: number;
  buttonText: string;
  buttonVariant: ButtonProps['variant'];
  currency: string;
  userEmail: string;
  disabled?: boolean;
}

interface PaystackExecutorProps {
    plan: 'premium' | 'pro-plus';
    amountInKobo: number;
    buttonText: string;
    buttonVariant: ButtonProps['variant'];
    currency: string;
    userEmail: string;
    disabled: boolean;
    user: User;
}

// This inner component is only rendered when all data is valid,
// ensuring the usePaystackPayment hook is initialized correctly.
function PaystackPaymentExecutor({
    plan,
    amountInKobo,
    buttonText,
    buttonVariant,
    currency,
    userEmail,
    disabled,
    user,
}: PaystackExecutorProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;

  const config = useMemo(() => ({
    reference: new Date().getTime().toString(),
    email: userEmail,
    amount: amountInKobo,
    publicKey: paystackKey,
    currency: currency.toUpperCase(),
  }), [userEmail, amountInKobo, paystackKey, currency]);

  const initializePayment = usePaystackPayment(config);

  const onPaymentSuccess = async (res: { reference: string }) => {
    setIsProcessing(true);
    try {
      const result: VerifyPaymentOutput = await verifyPaymentAndUpdatePlan({
        reference: res.reference,
        plan: plan,
        userId: user.uid,
      });

      if (result.success) {
        toast({
          title: 'Upgrade Successful!',
          description: `Your plan has been upgraded to ${plan}. Redirecting...`,
        });
        router.push('/dashboard');
      } else {
        throw new Error(result.message || 'Payment verification failed.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upgrade Failed',
        description: error.message || 'An unexpected error occurred.',
      });
       setIsProcessing(false);
    }
  };

  const onPaymentClose = () => {
    // User closed the popup
  };

  const handlePayment = () => {
    initializePayment({ onSuccess: onPaymentSuccess, onClose: onPaymentClose });
  };

  return (
      <Button
          size="lg"
          className="w-full"
          variant={buttonVariant}
          onClick={handlePayment}
          disabled={disabled || isProcessing}
      >
          {isProcessing ? <Loader2 className="animate-spin" /> : buttonText}
      </Button>
  );
}


export function PaystackPaymentButton({
  plan,
  buttonText,
  buttonVariant,
  disabled = false,
  ...props
}: PaystackPaymentButtonProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

  // The 'free' plan button just redirects to sign up.
  if (plan === 'free') {
    return (
      <Button
        size="lg"
        className="w-full"
        variant={buttonVariant}
        onClick={() => router.push('/auth/signup')}
      >
        {buttonText}
      </Button>
    );
  }
  
  // Return a non-functional button if Paystack is not configured for paid plans.
  if (!paystackKey || paystackKey === 'your_paystack_public_key_here') {
    return <Button disabled>Paystack Not Configured</Button>;
  }

  const handleAuthRedirect = () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in or create an account to upgrade your plan.',
        variant: 'destructive',
      });
      router.push('/auth/login');
    } else if (!props.userEmail) {
      toast({
        title: 'Email Required for Purchase',
        description: 'Please add an email to your profile in settings before upgrading.',
        variant: 'destructive',
      });
      router.push('/dashboard/settings');
    }
  };

  // If we don't have a logged-in user or an email, render a button that explains what to do.
  if (!user || !props.userEmail) {
    return (
      <Button
        size="lg"
        className="w-full"
        variant={buttonVariant}
        onClick={handleAuthRedirect}
        disabled={disabled}
      >
        {buttonText}
      </Button>
    );
  }

  // If all checks pass, render the actual payment executor component.
  return (
    <PaystackPaymentExecutor
      plan={plan}
      buttonText={buttonText}
      buttonVariant={buttonVariant}
      disabled={disabled}
      user={user}
      {...props}
    />
  );
}
