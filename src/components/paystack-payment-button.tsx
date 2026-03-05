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

  // State to manage loading of the Paystack public key and payment processing
  const [paystackKey, setPaystackKey] = useState<string | null>(null);
  const [isKeyLoading, setIsKeyLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Effect to fetch the Paystack public key from the server API route on mount.
  // This is a security best practice to avoid exposing keys directly if not needed.
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

  // The 'free' plan button is not a payment button, it just redirects to the sign-up page.
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

  // Memoize the Paystack configuration object to prevent re-creation on every render.
  // This object is passed to the usePaystackPayment hook.
  const config = useMemo(() => {
    // The config can only be created if we have the user, their email, and the Paystack key.
    if (!user || !userEmail || !paystackKey) return null;
    return {
      reference: new Date().getTime().toString(),
      email: userEmail,
      plan: planCode, // For subscriptions, the 'plan' code is used. 'amount' is ignored by Paystack.
      publicKey: paystackKey,
      currency,
      channels: ['mobile_money', 'card'], // As you suggested, limit channels for a better UX.
      metadata: {
        uid: user.uid,
        planName: plan,
      },
    };
  }, [user, userEmail, paystackKey, planCode, currency, plan]);

  // The main hook from react-paystack that provides the initializePayment function.
  const initializePayment = usePaystackPayment(config || {});

  // Callback for successful payment from the Paystack popup.
  const onPaymentSuccess = async (res: { reference: string }) => {
    if (!user) return; // Should not happen, but a good safeguard.
    setIsProcessing(true);
    try {
      // After a successful client-side payment, we MUST verify it on the server.
      // This is a critical security step to prevent tampering.
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
        // If the server verification fails, throw an error.
        throw new Error(result.error || 'Payment verification failed.');
      }

      toast({
        title: 'Upgrade Successful!',
        description: `Your plan has been upgraded to ${plan}. Redirecting...`,
      });
      // Redirect to the dashboard on success.
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

  // Callback for when the user closes the Paystack popup without paying.
  const onPaymentClose = () => {
    // You can optionally add a toast or analytics event here.
  };

  // This function is called when the user clicks the payment button.
  const handlePayment = () => {
    // A series of checks to ensure everything is ready for payment.
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
    if (!paystackKey || !config) {
      toast({
        title: 'Payment Service Not Ready',
        description: 'The connection to the payment service is not ready. Please wait a moment and try again.',
        variant: 'destructive',
      });
      return;
    }

    // If all checks pass, initialize the payment.
    initializePayment({ onSuccess: onPaymentSuccess, onClose: onPaymentClose });
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
