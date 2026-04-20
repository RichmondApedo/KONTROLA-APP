'use client';

import { Button } from '@/components/ui/button';
import { Link as LinkIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useUser } from '@/firebase';
import { exchangeTokenForAccount } from '@/ai/flows/link-account-flow';
import { useMonoConnect } from '@/hooks/use-mono-connect';

interface MonoConnectButtonProps {
    publicKey: string;
    accountPurpose?: 'personal' | 'business' | 'both';
}

export function MonoConnectButton({ publicKey, accountPurpose = 'personal' }: MonoConnectButtonProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [isLinking, setIsLinking] = useState(false);
  
  const { isReady, open: openMono } = useMonoConnect(publicKey);

  const handleSuccess = async (response: { code: string }) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'You must be signed in.' });
        return;
    }
    setIsLinking(true);
    try {
        const idToken = await user.getIdToken();
        const result = await exchangeTokenForAccount({ 
            code: response.code, 
            userId: user.uid,
            accountPurpose,
            idToken
        });
        // If the server action gets here, it was successful.
        toast({ title: 'Success!', description: result.message });
    } catch (error: any) {
        // Any failure in the server action will be caught here and displayed to the user.
        toast({
            variant: 'destructive',
            title: 'Account Linking Failed',
            description: error.message || 'An unexpected error occurred.',
        });
    } finally {
        setIsLinking(false);
    }
  };

  const handleClick = () => {
    openMono(handleSuccess);
  };

  const isDisabled = isLinking || !isReady;

  let buttonText = 'Connect Mobile Money / Bank (Read-Only)';
  if (!isReady && !isLinking) {
    buttonText = 'Loading...';
  } else if (isLinking) {
    buttonText = 'Linking...';
  }

  return (
    <Button onClick={handleClick} disabled={isDisabled}>
      {isDisabled ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LinkIcon className="mr-2 h-4 w-4" />
      )}
      {buttonText}
    </Button>
  );
}
