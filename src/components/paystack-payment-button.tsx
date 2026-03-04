'use client';

import { usePaystackPayment } from 'react-paystack';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';
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
    // Fetch the key only once when the component mounts
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

  // The 'free' plan button just redirects to sign up.
  if (plan === 'free') {
    return (
      <Button
        size="lg"
        className="w-full"
        variant={buttonVariant}
        onClick={() => router.push('/signup')}
      >
        {buttonText}
      </Button>
    );
  }

  // Memoize config object to prevent re-creation on every render
  const config = useMemo(() => {
    if (!user || !userEmail || !paystackKey) return null;
    return {
      reference: new Date().getTime().toString(),
      email: userEmail,
      plan: planCode,
      publicKey: paystackKey,
      currency,
      channels: ['mobile_money', 'card'],
      metadata: {
        uid: user.uid,
        planName: plan,
      },
    };
  }, [user, userEmail, paystackKey, planCode, currency, plan]);

  const initializePayment = usePaystackPayment(config || {});

  const onPaymentSuccess = async (res: { reference: string }) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      const response = await fetch('/api/paystack/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: res.reference,
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
  };

  const onPaymentClose = () => {
    // User closed the popup, do nothing.
  };

  const handlePayment = () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in or create an account to upgrade your plan.',
        variant: 'destructive',
      });
      router.push('/login');
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
    if (!paystackKey || !config) {
      toast({
        title: 'Payment Service Not Ready',
        description: 'Please wait a moment and try again.',
        variant: 'destructive',
      });
      return;
    }
    initializePayment({ onSuccess: onPaymentSuccess, onClose: onPaymentClose });
  };

  const isButtonDisabled = disabled || isProcessing || isKeyLoading || !user;
  const buttonContent = () => {
    if (isProcessing) return 'Processing...';
    if (isKeyLoading) return 'Loading...';
    return buttonText;
  };

  return (
      <Button
          size="lg"
          className="w-full"
          variant={buttonVariant}
          onClick={handlePayment}
          disabled={isButtonDisabled}
      >
          {(isProcessing || isKeyLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {buttonContent()}
      </Button>
  );
}