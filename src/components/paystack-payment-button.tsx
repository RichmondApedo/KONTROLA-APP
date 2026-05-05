
'use client';

import { Button, type ButtonProps } from '@/components/ui/button';
import PaystackPop from '@paystack/inline-js';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, RefreshCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSafeErrorMessage } from '@/lib/error-utils';
import { formatCurrency } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';

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
  const [showConsent, setShowConsent] = useState(false);

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

  const handleButtonClick = () => {
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
        description: 'To subscribe, please visit kontrolaapp.com/pricing in your browser. You can also manage your subscription in iOS Settings → Apple ID → Subscriptions.',
      });
      return;
    }

    setShowConsent(true);
  };

  const initiatePayment = () => {
    setIsProcessing(true);
    try {
      const paystack = new PaystackPop();

      paystack.newTransaction({
        key: paystackKey!,
        email: userEmail,
        amount: amount, // Passing amount instead of plan enables both MoMo and Card
        currency,
        metadata: {
          uid: user!.uid,
          planName: plan,
          planCode: planCode, // Still store this for metadata/audit
        },
        onSuccess: async (transaction: { reference: string }) => {
          // Keep processing true while verifying with our backend
          try {
            const idToken = await user!.getIdToken();
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
              description: `Your plan has been upgraded to ${plan}. Welcome aboard!`,
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
  const amountDisplay = formatCurrency(amount / 100, currency);
  const planDisplay = plan === 'pro-plus' ? 'Pro Plus' : 'Premium';

  return (
    <>
      <AlertDialog open={showConsent} onOpenChange={setShowConsent}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Confirm Your Subscription
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left text-sm text-foreground/80 pt-1">

                {/* Plan summary */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
                  <div className="flex justify-between font-bold text-foreground">
                    <span>KONTROLA {planDisplay}</span>
                    <span className="text-primary">{amountDisplay} / 30 days</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Access starts immediately after payment is confirmed.
                  </p>
                </div>

                {/* Card / Bank section */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-blue-600">Card &amp; Bank Payments</p>
                  <div className="flex items-start gap-2 text-xs text-foreground/80">
                    <RefreshCcw className="h-3 w-3 mt-0.5 text-blue-500 shrink-0" />
                    <span>
                      Your card or bank account will be <strong>charged automatically every 30 days</strong> until
                      you cancel. You can cancel anytime from <strong>Settings → Subscription</strong>.
                    </span>
                  </div>
                </div>

                {/* MoMo section */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-amber-600">Mobile Money (MoMo)</p>
                  <p className="text-xs text-foreground/80">
                    MoMo payments are <strong>not automatically recurring</strong> — each renewal requires your
                    PIN approval. You will need to manually renew every 30 days to keep your plan active.
                  </p>
                </div>

                <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                  <li>No refund is issued for the current billing period after payment.</li>
                  <li>Payments are processed securely by <strong>Paystack</strong>.</li>
                </ul>

                <p className="text-xs text-muted-foreground">
                  By proceeding you agree to our{' '}
                  <Link href="/terms" className="text-primary underline underline-offset-2" target="_blank">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-primary underline underline-offset-2" target="_blank">Privacy Policy</Link>.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={initiatePayment}
              className="bg-primary hover:bg-primary/90 font-bold"
            >
              Confirm &amp; Pay {amountDisplay}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        size="lg"
        className="w-full"
        variant={buttonVariant}
        onClick={handleButtonClick}
        disabled={isButtonDisabled}
      >
        {(isProcessing || isKeyLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isProcessing ? 'Processing...' : (isKeyLoading ? 'Loading...' : buttonText)}
      </Button>
    </>
  );
}
