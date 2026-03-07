'use client';

import PaystackPop from '@paystack/inline-js';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PaystackPaymentButtonProps {
  plan: 'free' | 'premium' | 'pro-plus';
  planCode: string;
  buttonText: string;
  buttonVariant: ButtonProps['variant'];
  userEmail: string;
  currency: string;
  disabled?: boolean;
}

export function PaystackPaymentButton({
  plan,
  planCode,
  buttonText,
  buttonVariant,
  disabled = false,
  userEmail,
  currency,
}: PaystackPaymentButtonProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [paystackKey, setPaystackKey] = useState<string | null>(null);
  const [isKeyLoading, setIsKeyLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetch('/api/paystack-key')
      .then(res => res.json())
      .then(data => {
        if (data && data.publicKey) {
          setPaystackKey(data.publicKey);
        }
      })
      .catch(console.error)
      .finally(() => setIsKeyLoading(false));
  }, []);

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
    if (!userEmail) {
      toast({
        title: 'Email Required for Purchase',
        description: 'Please add an email to your profile in settings before upgrading.',
        variant: 'destructive',
      });
      router.push('/dashboard/settings');
      return;
    }
    if (!paystackKey) {
      toast({
        title: 'Payment Service Not Ready',
        description: 'The connection to the payment service is not ready. Please wait a moment and try again.',
        variant: 'destructive',
      });
      return;
    }

    const paystack = new PaystackPop();

    paystack.newTransaction({
      key: paystackKey,
      email: userEmail,
      plan: planCode,
      currency,
      channels: ['mobile_money', 'card'],
      metadata: {
        uid: user.uid,
        planName: plan,
      },
      onSuccess: async (transaction) => {
        setIsProcessing(true);
        try {
          const response = await fetch('/api/paystack/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reference: transaction.reference,
              plan: plan,
              userId: user.uid,
              planCode: planCode,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Payment verification failed.');
          }
          
          toast({
            title: 'Upgrade Successful!',
            description: `Your plan has been upgraded to ${plan}. Redirecting...`,
          });
          router.push('/dashboard');

        } catch (error: any) {
          toast({
            variant: 'destructive',
            title: 'Upgrade Failed',
            description: error.message || 'An unexpected error occurred.',
          });
        } finally {
          setIsProcessing(false);
        }
      },
      onClose: () => {
        // User closed the popup, no action needed.
      },
    });
  };

  const isButtonDisabled = disabled || isProcessing || isKeyLoading || !user;

  return (
    <Button
      size="lg"
      className="w-full"
      variant={buttonVariant}
      onClick={handlePayment}
      disabled={isButtonDisabled}
    >
      {(isProcessing || isKeyLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {isProcessing ? 'Processing...' : (isKeyLoading ? 'Loading...' : buttonText)}
    </Button>
  );
}
