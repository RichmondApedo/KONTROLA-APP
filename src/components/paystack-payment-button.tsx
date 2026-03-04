'use client';

import { usePaystackPayment } from 'react-paystack';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { verifyPaymentAndUpdatePlan } from '@/ai/flows/verify-payment-flow';
import type { VerifyPaymentOutput } from '@/ai/flows/verify-payment-flow';
import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';


interface PaystackPaymentButtonProps {
  plan: 'free' | 'premium' | 'pro-plus';
  amountInKobo: number;
  buttonText: string;
  buttonVariant: ButtonProps['variant'];
  currency: string;
  disabled?: boolean;
}

export function PaystackPaymentButton({
  plan,
  amountInKobo,
  buttonText,
  buttonVariant,
  currency,
  disabled = false,
}: PaystackPaymentButtonProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const profileDocRef = useMemo(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/profile`, user.uid) : null),
    [user, firestore]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileDocRef);


  const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

  if (!paystackKey || paystackKey === 'your_paystack_public_key_here') {
    if (plan !== 'free') {
        return <Button disabled>Paystack Not Configured</Button>
    }
  }

  const config = useMemo(() => ({
    reference: new Date().getTime().toString(),
    email: profile?.email || user?.email || '',
    amount: amountInKobo,
    publicKey: paystackKey,
    currency: currency.toUpperCase(),
  }), [profile, user, amountInKobo, paystackKey, currency]);

  const initializePayment = usePaystackPayment(config);

  const onPaymentSuccess = async (res: { reference: string }) => {
    setIsLoading(true);
    try {
      if (!user) throw new Error('User not found');
      
      const result: VerifyPaymentOutput = await verifyPaymentAndUpdatePlan({
        reference: res.reference,
        plan: plan,
        userId: user.uid,
      });

      if (result.success) {
        toast({
          title: 'Upgrade Successful!',
          description: `Your plan has been upgraded to ${plan}.`,
        });
        // Optionally redirect or refresh data here
      } else {
        throw new Error(result.message || 'Payment verification failed.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upgrade Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onPaymentClose = () => {
    // Implementation for what should happen when the Paystack dialog is closed.
    console.log('Payment window closed');
  };

  const handlePayment = () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in or create an account to upgrade your plan.',
        variant: 'destructive',
      });
      router.push('/auth/login');
      return;
    }

    if (!config.email) {
      toast({
        title: 'Email Required for Purchase',
        description: 'Please add an email to your profile in settings before upgrading.',
        variant: 'destructive',
      });
      router.push('/dashboard/settings');
      return;
    }

    initializePayment({ onSuccess: onPaymentSuccess, onClose: onPaymentClose });
  };

  if (plan === 'free') {
      return (
          <Button size="lg" className="w-full" variant={buttonVariant} onClick={() => router.push('/auth/signup')}>
            {buttonText}
          </Button>
      )
  }

  return (
    <Button
      size="lg"
      className="w-full"
      variant={buttonVariant}
      onClick={handlePayment}
      disabled={disabled || isLoading || isProfileLoading}
    >
      {isLoading || isProfileLoading ? <Loader2 className="animate-spin" /> : buttonText}
    </Button>
  );
}
