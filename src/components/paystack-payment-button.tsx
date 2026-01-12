'use client';

import { usePaystackPayment } from 'react-paystack';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { verifyPaymentAndUpdatePlan } from '@/ai/flows/verify-payment-flow';
import type { VerifyPaymentOutput } from '@/ai/flows/verify-payment-flow';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface PaystackPaymentButtonProps {
  plan: 'free' | 'premium' | 'pro-plus';
  amountInKobo: number;
  buttonText: string;
  buttonVariant: ButtonProps['variant'];
  disabled?: boolean;
}

export function PaystackPaymentButton({
  plan,
  amountInKobo,
  buttonText,
  buttonVariant,
  disabled = false,
}: PaystackPaymentButtonProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

  if (!paystackKey || paystackKey === 'your_paystack_public_key_here') {
    if (plan !== 'free') {
        return <Button disabled>Paystack Not Configured</Button>
    }
  }

  const config = {
    reference: new Date().getTime().toString(),
    email: user?.email || '',
    amount: amountInKobo,
    publicKey: paystackKey,
  };

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

  if (plan === 'free') {
      return (
          <Button size="lg" className="w-full" variant={buttonVariant}>
            {buttonText}
          </Button>
      )
  }

  return (
    <Button
      size="lg"
      className="w-full"
      variant={buttonVariant}
      onClick={() => initializePayment({onSuccess: onPaymentSuccess, onClose: onPaymentClose})}
      disabled={disabled || isLoading}
    >
      {isLoading ? <Loader2 className="animate-spin" /> : buttonText}
    </Button>
  );
}
