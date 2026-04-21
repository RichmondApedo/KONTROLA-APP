
'use client';

import { Button, type ButtonProps } from '@/components/ui/button';
import PaystackPop from '@paystack/inline-js';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSafeErrorMessage } from '@/lib/error-utils';

// Detect if running inside a Capacitor native app
const isCapacitorNative = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

interface PaystackPaymentButtonProps {
  plan: 'free' | 'premium' | 'pro-plus';
  planCode: string;
  amount: number; // in absolute units (e.g. pesewas)
  buttonText: string;
  buttonVariant: ButtonProps['variant'];
  userEmail: string;
  currency: string;
  disabled?: boolean;
  publicKey?: string | null;
}

export function PaystackPaymentButton({
  plan,
  planCode,
  amount,
  buttonText,
  buttonVariant,
  disabled = false,
  userEmail,
  currency,
  publicKey: externalPublicKey,
}: PaystackPaymentButtonProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [paystackKey, setPaystackKey] = useState<string | null>(externalPublicKey || null);
  const [isKeyLoading, setIsKeyLoading] = useState(!externalPublicKey);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // If we already have a key from the parent, don't fetch it again
    if (externalPublicKey) {
      setPaystackKey(externalPublicKey);
      setIsKeyLoading(false);
      return;
    }

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

  const handlePayment = async () => {
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

    // On native Capacitor apps, Paystack inline popup cannot open in a restricted WebView.
    // Direct the user to the hosted web version instead.
    if (isCapacitorNative) {
      toast({
        title: 'Complete Purchase on Web',
        description: 'To subscribe, please visit kontrolaapp.com/pricing in your browser.',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const paystack = new PaystackPop();

      paystack.newTransaction({
      key: paystackKey,
      email: userEmail,
      amount: amount, // Passing amount instead of plan enables both MoMo and Card
      currency,
      metadata: {
        uid: user.uid,
        planName: plan,
        planCode: planCode, // Still store this for metadata/audit
      },
      onSuccess: async (transaction: { reference: string }) => {
        // Keep processing true while verifying with our backend
        try {
          const idToken = await user.getIdToken();
          const response = await fetch('/api/paystack/verify', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              reference: transaction.reference,
              plan: plan,
              planCode: planCode,
              amount: amount,
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
          // Refresh server state so profile/plan updates immediately in the UI
          router.refresh();
          router.push('/dashboard');

        } catch (error: any) {
          const safeMessage = getSafeErrorMessage(error, 'PaystackVerifyInButton');
          toast({
            variant: 'destructive',
            title: 'Upgrade Failed',
            description: safeMessage,
          });
          setIsProcessing(false); // Only disable if verify fails
        }
      },
      onClose: () => {
        // User closed the popup manually or it crashed. Release lock.
        setIsProcessing(false);
      },
    });
    } catch (err) {
      setIsProcessing(false); // Reset on import failure
      const safeMessage = getSafeErrorMessage(err, 'PaystackLoadInButton');
      toast({
        variant: 'destructive',
        title: 'Payment System Error',
        description: safeMessage,
      });
    }
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
