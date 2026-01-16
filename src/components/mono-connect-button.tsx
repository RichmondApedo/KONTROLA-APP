'use client';

import { useMonoConnect } from '@mono.co/connect';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2, Link as LinkIcon } from 'lucide-react';
import { exchangeTokenForAccount } from '@/ai/flows/link-account-flow';

export function MonoConnectButton() {
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const monoKey = process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY || '';

  const { open } = useMonoConnect({
    key: monoKey,
    onSuccess: async ({ code }) => {
      if (!user) {
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'You must be signed in to link an account.',
        });
        return;
      }
      setIsLoading(true);
      try {
        const result = await exchangeTokenForAccount({
            publicToken: code,
            userId: user.uid,
        });

        if (result.success) {
            toast({
                title: 'Account Linked!',
                description: 'Your account has been successfully synchronized.',
            });
        } else {
            throw new Error(result.message || 'Failed to link account.');
        }

      } catch (error: any) {
         toast({
            variant: 'destructive',
            title: 'Linking Failed',
            description: error.message || 'An unexpected error occurred.',
        });
      } finally {
        setIsLoading(false);
      }
    },
    onClose: () => {
      console.log('Mono Connect widget closed.');
      setIsLoading(false);
    },
    onLoad: () => {
      console.log('Mono Connect widget loaded successfully');
    },
  });

  const handleConnect = () => {
     if (!monoKey || monoKey === 'your_mono_public_key_here') {
        toast({
            title: "Feature Not Configured",
            description: "Bank synchronization is not configured by the app administrator.",
        });
        return;
     }
     setIsLoading(true);
     open();
  }

  return (
    <Button onClick={handleConnect} disabled={isLoading}>
        {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
            <LinkIcon className="mr-2 h-4 w-4" />
        )}
      Connect New Account
    </Button>
  );
}
