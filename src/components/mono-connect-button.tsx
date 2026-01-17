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
}

export function MonoConnectButton({ publicKey }: MonoConnectButtonProps) {
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
        const result = await exchangeTokenForAccount({ code: response.code, userId: user.uid });
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

  let buttonText = 'Connect New Account';
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
